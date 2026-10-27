"""Load the local UCI Zoo CSV with stable record IDs."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.schema import FEATURE_NAMES, category_payload

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "zoo.csv"
COLUMNS = ["animal_name", *FEATURE_NAMES, "class_type"]


def load_zoo_frame(path: Path | None = None) -> pd.DataFrame:
    csv_path = Path(path) if path else DATA_PATH
    if not csv_path.is_file():
        raise FileNotFoundError(f"Dataset not found: {csv_path}")
    frame = pd.read_csv(csv_path)
    missing = [col for col in COLUMNS if col not in frame.columns]
    if missing:
        raise ValueError(f"Dataset is missing columns: {missing}")
    frame = frame.copy()
    if "record_id" not in frame.columns:
        frame.insert(0, "record_id", range(1, len(frame) + 1))
    name_counts = frame.groupby("animal_name").cumcount()
    labels = frame["animal_name"].astype(str)
    duplicates = frame["animal_name"].duplicated(keep=False)
    frame["display_name"] = labels.where(~duplicates, labels + " #" + (name_counts + 1).astype(str))
    return frame


def records_as_dicts(frame: pd.DataFrame | None = None) -> list[dict]:
    data = frame if frame is not None else load_zoo_frame()
    records = []
    for _, row in data.iterrows():
        features = {name: int(row[name]) for name in FEATURE_NAMES}
        class_id = int(row["class_type"])
        records.append(
            {
                "record_id": int(row["record_id"]),
                "animal_name": str(row["animal_name"]),
                "display_name": str(row["display_name"]),
                "features": features,
                "class_type": class_id,
                "category": category_payload(class_id),
            }
        )
    return records


def get_record(record_id: int, frame: pd.DataFrame | None = None) -> dict | None:
    data = frame if frame is not None else load_zoo_frame()
    match = data.loc[data["record_id"] == int(record_id)]
    if match.empty:
        return None
    return records_as_dicts(match)[0]


def find_by_name(name: str, frame: pd.DataFrame | None = None) -> list[dict]:
    data = frame if frame is not None else load_zoo_frame()
    key = str(name).strip().lower()
    match = data.loc[data["animal_name"].str.lower() == key]
    if match.empty:
        return []
    return records_as_dicts(match)
