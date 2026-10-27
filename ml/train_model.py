"""Train a Decision Tree on the Zoo dataset and write evaluation metadata.

The original pickled model (sklearn 1.6.1) is kept as zoo_model.original.joblib.
A retrained DecisionTreeClassifier with the same hyperparameters is saved as
zoo_model.joblib so the served model matches documented test metrics.
"""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_fscore_support,
)
from sklearn.model_selection import StratifiedShuffleSplit
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.dataset import load_zoo_frame  # noqa: E402
from ml.schema import FEATURE_NAMES, category_payload  # noqa: E402

MODEL_PATH = ROOT / "zoo_model.joblib"
ORIGINAL_BACKUP = ROOT / "zoo_model.original.joblib"
METADATA_PATH = ROOT / "ml" / "model_metadata.json"
RANDOM_STATE = 1
MAX_DEPTH = 6
TEST_SIZE = 0.25


def _per_class_metrics(y_true, y_pred, labels: list[int]) -> list[dict]:
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, zero_division=0
    )
    rows = []
    for index, class_id in enumerate(labels):
        rows.append(
            {
                "class_id": int(class_id),
                "name": category_payload(class_id)["name"],
                "precision": float(precision[index]),
                "recall": float(recall[index]),
                "f1": float(f1[index]),
                "support": int(support[index]),
            }
        )
    return rows


def train_and_evaluate() -> dict:
    frame = load_zoo_frame()
    X = frame[FEATURE_NAMES]
    y = frame["class_type"].astype(int)
    labels = [1, 2, 3, 4, 5, 6, 7]

    splitter = StratifiedShuffleSplit(
        n_splits=1, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )
    train_index, test_index = next(splitter.split(X, y))
    X_train, X_test = X.iloc[train_index], X.iloc[test_index]
    y_train, y_test = y.iloc[train_index], y.iloc[test_index]

    model = DecisionTreeClassifier(max_depth=MAX_DEPTH, random_state=RANDOM_STATE)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    y_train_pred = model.predict(X_train)

    matrix = confusion_matrix(y_test, y_pred, labels=labels)
    importance = [
        {"feature": name, "importance": float(value)}
        for name, value in zip(FEATURE_NAMES, model.feature_importances_)
    ]
    importance.sort(key=lambda item: item["importance"], reverse=True)

    report = classification_report(
        y_test, y_pred, labels=labels, zero_division=0, output_dict=True
    )

    metadata = {
        "evaluation_procedure": (
            "StratifiedShuffleSplit hold-out (test_size=0.25, random_state=1) "
            "on the 101-row UCI Zoo dataset. The served model is a DecisionTreeClassifier "
            "retrained with max_depth=6 and random_state=1 on the training portion only."
        ),
        "caveat": (
            "The dataset is small and imbalanced. Amphibians and reptiles have very few "
            "examples, so per-class scores can change a lot with a different split. "
            "Training accuracy is reported separately and is not test accuracy."
        ),
        "dataset_records": int(len(frame)),
        "feature_count": 16,
        "n_classes": 7,
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
        "model_name": "DecisionTreeClassifier",
        "hyperparameters": {"max_depth": MAX_DEPTH, "random_state": RANDOM_STATE},
        "test_accuracy": float(accuracy_score(y_test, y_pred)),
        "train_accuracy": float(accuracy_score(y_train, y_train_pred)),
        "macro_f1": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        "weighted_f1": float(f1_score(y_test, y_pred, average="weighted", zero_division=0)),
        "per_class": _per_class_metrics(y_test, y_pred, labels),
        "confusion_matrix": {
            "labels": labels,
            "label_names": [category_payload(i)["name"] for i in labels],
            "matrix": matrix.astype(int).tolist(),
            "row_meaning": "actual class",
            "column_meaning": "predicted class",
            "cell_count_denominator": "absolute counts of held-out test examples",
        },
        "feature_importance": importance,
        "classification_report": report,
        "test_record_ids": frame.iloc[test_index]["record_id"].astype(int).tolist(),
        "train_record_ids": frame.iloc[train_index]["record_id"].astype(int).tolist(),
    }

    if MODEL_PATH.is_file() and not ORIGINAL_BACKUP.is_file():
        shutil.copy2(MODEL_PATH, ORIGINAL_BACKUP)

    joblib.dump(model, MODEL_PATH)
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return metadata


def main() -> None:
    metadata = train_and_evaluate()
    print(
        json.dumps(
            {
                "saved_model": str(MODEL_PATH),
                "original_backup": str(ORIGINAL_BACKUP) if ORIGINAL_BACKUP.is_file() else None,
                "train_size": metadata["train_size"],
                "test_size": metadata["test_size"],
                "test_accuracy": metadata["test_accuracy"],
                "train_accuracy": metadata["train_accuracy"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
