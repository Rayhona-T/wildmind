import pytest

from app import app
from ml.schema import FEATURE_NAMES


@pytest.fixture()
def client():
    app.config["TESTING"] = True
    with app.test_client() as test_client:
        yield test_client


def _valid_features():
    return {
        "hair": 0,
        "feathers": 1,
        "eggs": 1,
        "milk": 0,
        "airborne": 1,
        "aquatic": 0,
        "predator": 0,
        "toothed": 0,
        "backbone": 1,
        "breathes": 1,
        "venomous": 0,
        "fins": 0,
        "legs": 2,
        "tail": 1,
        "domestic": 0,
        "catsize": 0,
    }


def test_home_renders(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"WILDMIND" in response.data


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.get_json()
    assert body["model_ready"] is True
    assert body["dataset_ready"] is True


def test_metadata(client):
    response = client.get("/api/metadata")
    body = response.get_json()
    assert body["feature_names"] == FEATURE_NAMES
    assert body["supports_proba"] is True
    assert len(body["categories"]) == 7


def test_predict_ok(client):
    response = client.post("/api/predict", json={"features": _valid_features()})
    assert response.status_code == 200
    body = response.get_json()
    assert body["ok"] is True
    assert body["predicted_class"] in range(1, 8)
    assert "Birds" in body["category"]["name"] or body["predicted_class"] == 2


def test_predict_missing(client):
    features = _valid_features()
    del features["fins"]
    response = client.post("/api/predict", json={"features": features})
    assert response.status_code == 400
    assert response.get_json()["ok"] is False


def test_predict_bad_legs(client):
    features = _valid_features()
    features["legs"] = 9
    response = client.post("/api/predict", json={"features": features})
    assert response.status_code == 400


def test_evaluate_record(client):
    response = client.post("/api/evaluate-record", json={"animal_name": "lion"})
    assert response.status_code == 200
    body = response.get_json()
    assert body["actual_class"] == 1
    assert "match" in body
    assert body["prediction"]["predicted_class"] in range(1, 8)


def test_evaluate_model(client):
    response = client.get("/api/evaluate-model")
    assert response.status_code == 200
    body = response.get_json()
    evaluation = body["evaluation"]
    assert 0 <= evaluation["test_accuracy"] <= 1
    assert evaluation["train_size"] + evaluation["test_size"] == evaluation["dataset_records"]
    assert len(evaluation["confusion_matrix"]["matrix"]) == 7


def test_records_list(client):
    response = client.get("/api/records")
    body = response.get_json()
    assert body["count"] == 101
