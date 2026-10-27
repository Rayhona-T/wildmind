"""Print stored evaluation metrics, or regenerate them."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ml.train_model import METADATA_PATH, train_and_evaluate  # noqa: E402


def main() -> None:
    regenerate = "--retrain" in sys.argv
    if regenerate or not METADATA_PATH.is_file():
        metadata = train_and_evaluate()
    else:
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    print(json.dumps({
        "procedure": metadata["evaluation_procedure"],
        "test_accuracy": metadata["test_accuracy"],
        "train_accuracy": metadata["train_accuracy"],
        "per_class": metadata["per_class"],
        "caveat": metadata["caveat"],
    }, indent=2))


if __name__ == "__main__":
    main()
