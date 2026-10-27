"""Model adapter: load once, validate inputs, predict with the saved artifact."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from ml.schema import (
    BINARY_FEATURES,
    CATEGORIES,
    FEATURE_NAMES,
    LEGS_VALUES,
    category_payload,
)

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = ROOT / "zoo_model.joblib"


class PredictionError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _as_binary(name: str, value: Any) -> int:
    if value in (True, 1, "1", "true", "True", "yes", "on"):
        return 1
    if value in (False, 0, "0", "false", "False", "no", "off"):
        return 0
    raise PredictionError(f"Feature '{name}' must be a binary value (0 or 1).")


def _as_legs(value: Any) -> int:
    try:
        legs = int(value)
    except (TypeError, ValueError) as exc:
        raise PredictionError("Feature 'legs' must be one of 0, 2, 4, 5, 6, or 8.") from exc
    if legs not in LEGS_VALUES:
        raise PredictionError("Feature 'legs' must be one of 0, 2, 4, 5, 6, or 8.")
    return legs


def validate_features(payload: dict[str, Any]) -> dict[str, int]:
    if not isinstance(payload, dict):
        raise PredictionError("Request body must be a JSON object of features.")
    missing = [name for name in FEATURE_NAMES if name not in payload]
    if missing:
        raise PredictionError(f"Missing features: {', '.join(missing)}.")
    extras = [key for key in payload if key not in FEATURE_NAMES and key != "features"]
    # extras are ignored unless they collide; keep strict on unknown predictive keys only
    cleaned: dict[str, int] = {}
    for name in BINARY_FEATURES:
        cleaned[name] = _as_binary(name, payload[name])
    cleaned["legs"] = _as_legs(payload["legs"])
    if extras:
        # Allow wrapping keys used by the API, reject unexpected trait names.
        unexpected = [key for key in extras if key not in {"animal", "record_id", "mode"}]
        if unexpected:
            raise PredictionError(f"Unexpected fields: {', '.join(sorted(unexpected))}.")
    return cleaned


def features_to_frame(features: dict[str, int]) -> pd.DataFrame:
    row = {name: features[name] for name in FEATURE_NAMES}
    return pd.DataFrame([row], columns=FEATURE_NAMES)


class ModelService:
    def __init__(self, model_path: Path | None = None):
        self.model_path = Path(model_path) if model_path else DEFAULT_MODEL_PATH
        self.model = None
        self.ready = False
        self.error: str | None = None
        self.supports_proba = False
        self.supports_importance = False
        self.feature_names = list(FEATURE_NAMES)
        self.classes: list[int] = list(range(1, 8))
        self.model_name = "DecisionTreeClassifier"
        self._load()

    def _load(self) -> None:
        if not self.model_path.is_file():
            self.error = (
                "Model file zoo_model.joblib was not found. "
                "Place the trained artifact in the project root or run python ml/train_model.py."
            )
            return
        try:
            model = joblib.load(self.model_path)
        except Exception:
            self.error = "The model artifact could not be loaded. Retrain with python ml/train_model.py."
            return
        if hasattr(model, "feature_names_in_"):
            names = [str(name) for name in model.feature_names_in_]
            if names != FEATURE_NAMES:
                self.error = "Saved model feature order does not match the Zoo dataset schema."
                return
            self.feature_names = names
        if hasattr(model, "n_features_in_") and int(model.n_features_in_) != 16:
            self.error = "Saved model does not expect 16 predictive features."
            return
        if hasattr(model, "classes_"):
            self.classes = [int(c) for c in model.classes_]
        self.model = model
        self.model_name = type(model).__name__
        self.supports_proba = callable(getattr(model, "predict_proba", None))
        self.supports_importance = hasattr(model, "feature_importances_")
        self.ready = True

    def require_ready(self) -> None:
        if not self.ready or self.model is None:
            raise PredictionError(self.error or "Model is not ready.", status_code=503)

    def predict(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.require_ready()
        features = validate_features(payload)
        frame = features_to_frame(features)
        try:
            predicted = int(self.model.predict(frame)[0])
        except Exception:
            raise PredictionError("The model could not classify this specimen.", status_code=500)
        if predicted not in CATEGORIES:
            raise PredictionError("The model returned an unknown class label.", status_code=500)

        probabilities = None
        confidence = None
        if self.supports_proba:
            try:
                raw = self.model.predict_proba(frame)[0]
                probabilities = {
                    int(label): float(score)
                    for label, score in zip(self.classes, raw)
                }
                confidence = float(probabilities[predicted])
            except Exception:
                probabilities = None
                confidence = None

        result: dict[str, Any] = {
            "predicted_class": predicted,
            "category": category_payload(predicted),
            "features": features,
            "confidence": confidence,
            "probabilities": probabilities,
            "supports_proba": self.supports_proba and probabilities is not None,
            "disclaimer": (
                "This is a machine-learning prediction, not a guarantee of biological correctness. "
                "Model-reported probabilities are not necessarily calibrated."
            ),
        }
        return result

    def metadata(self) -> dict[str, Any]:
        importance = None
        if self.ready and self.supports_importance:
            values = [float(v) for v in self.model.feature_importances_]
            importance = [
                {"feature": name, "importance": value}
                for name, value in zip(self.feature_names, values)
            ]
            importance.sort(key=lambda item: item["importance"], reverse=True)
        return {
            "ready": self.ready,
            "error": self.error,
            "model_name": self.model_name,
            "model_path": self.model_path.name,
            "feature_names": list(self.feature_names),
            "binary_features": list(BINARY_FEATURES),
            "legs_values": list(LEGS_VALUES),
            "classes": self.classes,
            "categories": [category_payload(i) for i in range(1, 8)],
            "supports_proba": self.supports_proba,
            "supports_importance": self.supports_importance,
            "feature_importance": importance,
            "dataset": {
                "name": "UCI Zoo",
                "source": "https://archive.ics.uci.edu/dataset/111/zoo",
                "predictive_features": 16,
                "target_classes": 7,
            },
        }
