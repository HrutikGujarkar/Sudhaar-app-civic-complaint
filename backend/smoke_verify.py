from __future__ import annotations

import random
from pathlib import Path

import requests


def _pick_one(folder: Path) -> Path:
    candidates = []
    for ext in ("*.jpg", "*.jpeg", "*.png"):
        candidates.extend(folder.glob(ext))
    if not candidates:
        raise FileNotFoundError(f"No images found in {folder}")
    return random.choice(candidates)


def main() -> int:
    data_root = Path(__file__).resolve().parents[1] / "data" / "train"

    genuine = _pick_one(data_root / "genuine")
    fake = _pick_one(data_root / "fake")

    for label, path in (("genuine", genuine), ("fake", fake)):
        with open(path, "rb") as f:
            r = requests.post(
                "http://127.0.0.1:8000/complaints/verify",
                files={"file": (path.name, f, "image/jpeg")},
                timeout=60,
            )
        print(label, path.name, "->", r.status_code, r.text)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
