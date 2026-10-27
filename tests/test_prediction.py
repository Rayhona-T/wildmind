from ml.predict import ModelService, PredictionError, features_to_frame, validate_features
from ml.schema import FEATURE_NAMES


def _valid():
    return {
        "hair": 1,
        "feathers": 0,
        "eggs": 0,
        "milk": 1,
        "airborne": 0,
        "aquatic": 0,
        "predator": 1,
        "toothed": 1,
        "backbone": 1,
        "breathes": 1,
        "venomous": 0,
        "fins": 0,
        "legs": 4,
        "tail": 1,
        "domestic": 0,
        "catsize": 1,
    }


def test_model_loads():
    service = ModelService()
    assert service.ready
    assert service.feature_names == FEATURE_NAMES
    assert service.supports_proba


def test_valid_prediction():
    service = ModelService()
    result = service.predict(_valid())
    assert result["predicted_class"] in range(1, 8)
    assert result["category"]["id"] == result["predicted_class"]
    assert result["supports_proba"] is True
    assert 0 <= result["confidence"] <= 1


def test_feature_order_preserved():
    frame = features_to_frame(_valid())
    assert list(frame.columns) == FEATURE_NAMES


def test_missing_features_rejected():
    payload = _valid()
    del payload["milk"]
    try:
        validate_features(payload)
        assert False, "expected error"
    except PredictionError as exc:
        assert "milk" in exc.message


def test_invalid_binary_rejected():
    payload = _valid()
    payload["hair"] = 3
    try:
        validate_features(payload)
        assert False, "expected error"
    except PredictionError:
        pass


def test_invalid_legs_rejected():
    payload = _valid()
    payload["legs"] = 3
    try:
        validate_features(payload)
        assert False, "expected error"
    except PredictionError as exc:
        assert "legs" in exc.message


def test_category_mapping_mammals_like_input():
    service = ModelService()
    result = service.predict(_valid())
    assert result["predicted_class"] == 1
    assert result["category"]["name"] == "Mammals"
