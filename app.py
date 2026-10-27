"""WildMind Flask application — prediction API and game pages."""

from __future__ import annotations

import json
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from ml.dataset import find_by_name, get_record, load_zoo_frame, records_as_dicts
from ml.predict import ModelService, PredictionError
from ml.schema import FEATURE_GROUPS, FEATURE_LABELS, FEATURE_NAMES, LEGS_VALUES, all_categories

ROOT = Path(__file__).resolve().parent
METADATA_PATH = ROOT / "ml" / "model_metadata.json"

app = Flask(__name__)
model_service = ModelService()
ZOO_FRAME = None
try:
    ZOO_FRAME = load_zoo_frame()
except FileNotFoundError:
    ZOO_FRAME = None


def _json_error(message: str, status: int):
    return jsonify({"ok": False, "error": message}), status


def _extract_feature_payload(body: dict) -> dict:
    if not isinstance(body, dict):
        raise PredictionError("Request body must be a JSON object.")
    if "features" in body and isinstance(body["features"], dict):
        return body["features"]
    return {name: body[name] for name in FEATURE_NAMES if name in body}


def _public_record(record: dict, include_label: bool = True) -> dict:
    payload = {
        "record_id": record["record_id"],
        "animal_name": record["animal_name"],
        "display_name": record["display_name"],
        "features": record["features"],
    }
    if include_label:
        payload["class_type"] = record["class_type"]
        payload["category"] = record["category"]
    return payload


@app.errorhandler(PredictionError)
def handle_prediction_error(exc: PredictionError):
    return _json_error(exc.message, exc.status_code)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/health")
def health():
    dataset_ready = ZOO_FRAME is not None
    return jsonify(
        {
            "ok": model_service.ready and dataset_ready,
            "model_ready": model_service.ready,
            "dataset_ready": dataset_ready,
            "dataset_records": int(len(ZOO_FRAME)) if dataset_ready else 0,
            "error": model_service.error,
        }
    )


@app.get("/api/metadata")
def metadata():
    payload = model_service.metadata()
    payload["ok"] = True
    payload["feature_groups"] = FEATURE_GROUPS
    payload["feature_labels"] = FEATURE_LABELS
    payload["legs_values"] = list(LEGS_VALUES)
    if ZOO_FRAME is not None:
        payload["dataset"]["record_count"] = int(len(ZOO_FRAME))
        counts = ZOO_FRAME["class_type"].value_counts().to_dict()
        payload["dataset"]["class_counts"] = {
            str(int(key)): int(value) for key, value in counts.items()
        }
    evaluation = _read_evaluation()
    if evaluation:
        payload["evaluation_available"] = True
        payload["dataset"]["train_size"] = evaluation.get("train_size")
        payload["dataset"]["test_size"] = evaluation.get("test_size")
        payload["model_name"] = evaluation.get("model_name", payload["model_name"])
    else:
        payload["evaluation_available"] = False
    return jsonify(payload)


@app.get("/api/categories")
def categories():
    return jsonify({"ok": True, "categories": all_categories()})


@app.get("/api/records")
def records():
    if ZOO_FRAME is None:
        return _json_error("Dataset is not available on the server.", 503)
    class_filter = request.args.get("class")
    query = (request.args.get("q") or "").strip().lower()
    items = records_as_dicts(ZOO_FRAME)
    if class_filter:
        try:
            class_id = int(class_filter)
        except ValueError:
            return _json_error("class must be an integer 1-7.", 400)
        items = [item for item in items if item["class_type"] == class_id]
    if query:
        items = [
            item
            for item in items
            if query in item["display_name"].lower() or query in item["animal_name"].lower()
        ]
    return jsonify({"ok": True, "count": len(items), "records": [_public_record(item) for item in items]})


@app.get("/api/records/<int:record_id>")
def record_detail(record_id: int):
    if ZOO_FRAME is None:
        return _json_error("Dataset is not available on the server.", 503)
    record = get_record(record_id, ZOO_FRAME)
    if record is None:
        return _json_error("No dataset record matches that identifier.", 404)
    return jsonify({"ok": True, "record": _public_record(record)})


@app.post("/api/predict")
def predict():
    body = request.get_json(silent=True)
    if body is None:
        return _json_error("JSON body required.", 400)
    features = _extract_feature_payload(body)
    result = model_service.predict(features)
    return jsonify({"ok": True, **result})


@app.post("/api/evaluate-record")
def evaluate_record():
    if ZOO_FRAME is None:
        return _json_error("Dataset is not available on the server.", 503)
    body = request.get_json(silent=True) or {}
    record = None
    if "record_id" in body:
        try:
            record_id = int(body["record_id"])
        except (TypeError, ValueError):
            return _json_error("record_id must be an integer.", 400)
        record = get_record(record_id, ZOO_FRAME)
    elif "animal" in body or "animal_name" in body:
        name = body.get("animal") or body.get("animal_name")
        matches = find_by_name(str(name), ZOO_FRAME)
        if len(matches) > 1:
            return jsonify(
                {
                    "ok": False,
                    "error": "Multiple records share that name. Use record_id.",
                    "candidates": [
                        {"record_id": item["record_id"], "display_name": item["display_name"]}
                        for item in matches
                    ],
                }
            ), 400
        record = matches[0] if matches else None
    else:
        return _json_error("Provide record_id or animal_name.", 400)
    if record is None:
        return _json_error("No matching dataset record was found.", 404)

    prediction = model_service.predict(record["features"])
    actual = record["class_type"]
    match = prediction["predicted_class"] == actual
    return jsonify(
        {
            "ok": True,
            "record": _public_record(record),
            "prediction": prediction,
            "actual_class": actual,
            "actual_category": record["category"],
            "match": match,
        }
    )


@app.get("/api/evaluate-model")
def evaluate_model():
    evaluation = _read_evaluation()
    if not evaluation:
        return _json_error(
            "Evaluation artifacts are not available. Run python ml/evaluate_model.py --retrain.",
            503,
        )
    return jsonify({"ok": True, "evaluation": evaluation})


def _read_evaluation() -> dict | None:
    if not METADATA_PATH.is_file():
        return None
    try:
        return json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None


if __name__ == "__main__":
    app.run(debug=True, port=5000)
