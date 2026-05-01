from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


FEATURE_ORDER = [
    "G1",
    "G2",
    "absences",
    "extracurricular",
    "Mjob",
    "Fjob",
    "traveltime",
]
LABEL_COL = "grade"
MODEL_VERSION = "1.0.0"
RANDOM_SEED = 42

JOB_ENCODING = {
    "at_home": 0,
    "health": 1,
    "other": 2,
    "services": 3,
    "teacher": 4,
}


@dataclass(frozen=True)
class TrainConfig:
    processed_data_path: Path
    model_path: Path


def numeric_to_letter(g3: float) -> str:
    n = int(round(float(g3)))
    if n >= 16:
        return "A"
    if n >= 13:
        return "B"
    if n >= 10:
        return "C"
    if n >= 7:
        return "D"
    return "F"


def encode_job(value: str) -> int:
    v = str(value).strip()
    return JOB_ENCODING.get(v, JOB_ENCODING["other"])


def encode_yes_no(value: str) -> int:
    v = str(value).strip().lower()
    return 1 if v in {"yes", "y", "true", "1"} else 0


def _drop_index_col(df: pd.DataFrame) -> pd.DataFrame:
    # Many UCI exports include an unnamed index column as the first column
    first = df.columns[0]
    if str(first).strip() in {"", "Unnamed: 0"}:
        return df.drop(columns=[first])
    return df


def load_raw_sources(paths: Iterable[Path]) -> pd.DataFrame:
    frames: List[pd.DataFrame] = []
    for p in paths:
        if not p.exists():
            continue
        df = pd.read_csv(p)
        df = _drop_index_col(df)
        frames.append(df)

    if not frames:
        raise FileNotFoundError("No raw dataset sources found")

    return pd.concat(frames, ignore_index=True)


def build_processed_dataset(raw: pd.DataFrame) -> pd.DataFrame:
    required = {"G1", "G2", "G3", "absences", "activities", "Mjob", "Fjob", "traveltime"}
    missing = sorted([c for c in required if c not in raw.columns])
    if missing:
        raise ValueError(f"Raw dataset missing required columns: {missing}")

    df = pd.DataFrame()
    df["G1"] = pd.to_numeric(raw["G1"], errors="raise")
    df["G2"] = pd.to_numeric(raw["G2"], errors="raise")
    df["absences"] = pd.to_numeric(raw["absences"], errors="raise")
    df["extracurricular"] = raw["activities"].map(encode_yes_no).astype(int)
    df["Mjob"] = raw["Mjob"].map(encode_job).astype(int)
    df["Fjob"] = raw["Fjob"].map(encode_job).astype(int)
    df["traveltime"] = pd.to_numeric(raw["traveltime"], errors="raise").astype(int)

    df[LABEL_COL] = raw["G3"].map(numeric_to_letter).astype(str)

    # Final strict ordering
    df = df[FEATURE_ORDER + [LABEL_COL]].copy()
    return df


def load_dataset(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    missing = [c for c in FEATURE_ORDER + [LABEL_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing columns: {missing}")

    # Ensure consistent ordering and types
    df = df[FEATURE_ORDER + [LABEL_COL]].copy()
    for col in FEATURE_ORDER:
        df[col] = pd.to_numeric(df[col], errors="raise")

    df[LABEL_COL] = df[LABEL_COL].astype(str)
    return df


def train_model(df: pd.DataFrame) -> dict:
    X = df[FEATURE_ORDER]
    y = df[LABEL_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_SEED,
        stratify=y if y.nunique() > 1 else None,
    )

    model = RandomForestClassifier(
        n_estimators=300,
        random_state=RANDOM_SEED,
        n_jobs=-1,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    acc = float(model.score(X_test, y_test)) if len(X_test) else 1.0

    bundle = {
        "model": model,
        "meta": {
            "feature_order": FEATURE_ORDER,
            "label_col": LABEL_COL,
            "model_version": MODEL_VERSION,
            "random_seed": RANDOM_SEED,
            "test_accuracy": acc,
        },
    }
    return bundle


def main() -> None:
    base = Path(__file__).resolve().parent

    # Raw sources (provided in this repo)
    raw_sources = [
        base.parent / "ml-service" / "cms data" / "mat2.csv",
        base.parent / "ml-service" / "cms data" / "por2.csv",
    ]

    cfg = TrainConfig(
        processed_data_path=base / "data" / "student.csv",
        model_path=base / "model" / "random_forest.pkl",
    )

    # Prefer training on mat2/por2 if available; otherwise fall back to existing processed file.
    if all(p.exists() for p in raw_sources):
        raw = load_raw_sources(raw_sources)
        processed = build_processed_dataset(raw)
        cfg.processed_data_path.parent.mkdir(parents=True, exist_ok=True)
        processed.to_csv(cfg.processed_data_path, index=False)
        df = processed
    else:
        df = load_dataset(cfg.processed_data_path)

    bundle = train_model(df)

    cfg.model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, cfg.model_path)

    print(json.dumps({"ok": True, "model_path": str(cfg.model_path), **bundle["meta"]}, indent=2))


if __name__ == "__main__":
    main()
