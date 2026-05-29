from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder


FEATURE_ORDER = [
    "G1",
    "G2",
    "grade_8_score",
    "grade_9_score",
    "grade_10_score",
    "traveltime",
    "absences",
    "Mjob",
    "Fjob",
    "activities",
]

NUMERICAL_FEATURES = [
    "G1",
    "G2",
    "grade_8_score",
    "grade_9_score",
    "grade_10_score",
    "traveltime",
    "absences",
]

CATEGORICAL_FEATURES = [
    "Mjob",
    "Fjob",
    "activities",
]

LABEL_COL = "G3_pct"
MODEL_VERSION = "4.0.0"
RANDOM_SEED = 42

MJOB_CATEGORIES = ["at_home", "health", "other", "services", "teacher"]
FJOB_CATEGORIES = ["at_home", "health", "other", "services", "teacher"]
ACTIVITIES_CATEGORIES = ["no", "yes"]

@dataclass(frozen=True)
class TrainConfig:
    processed_data_path: Path
    model_path: Path


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
    required = {
        "G1",
        "G2",
        "G3",
    }
    missing = sorted([c for c in required if c not in raw.columns])
    if missing:
        raise ValueError(f"Raw dataset missing required columns: {missing}")

    df = pd.DataFrame()
    g1 = pd.to_numeric(raw["G1"], errors="raise").clip(0, 20)
    g2 = pd.to_numeric(raw["G2"], errors="raise").clip(0, 20)
    df["G1"] = g1
    df["G2"] = g2

    base_pct = ((g1 + g2) / 2) * 5
    rng = np.random.default_rng(RANDOM_SEED)

    def resolve_score(col_name: str, std: float, bias: float) -> pd.Series:
        if col_name in raw.columns:
            series = pd.to_numeric(raw[col_name], errors="coerce")
            return series.div(5).clip(0, 20)

        noise = rng.normal(loc=bias, scale=std, size=len(base_pct))
        generated_pct = (base_pct + noise).clip(0, 100)
        return (generated_pct / 5).clip(0, 20)

    df["grade_8_score"] = resolve_score("grade_8_score", std=10, bias=-2.0)
    df["grade_9_score"] = resolve_score("grade_9_score", std=8, bias=0.0)
    df["grade_10_score"] = resolve_score("grade_10_score", std=5, bias=1.5)

    if "traveltime" in raw.columns:
        travel = pd.to_numeric(raw["traveltime"], errors="coerce")
        df["traveltime"] = travel.fillna(2).clip(1, 4)
    else:
        df["traveltime"] = 2

    if "absences" in raw.columns:
        absences = pd.to_numeric(raw["absences"], errors="coerce")
        df["absences"] = absences.fillna(0).clip(0, 93)
    else:
        df["absences"] = 0

    def normalize_job(series: pd.Series) -> pd.Series:
        normalized = series.fillna("other").astype(str).str.lower().str.strip()
        return normalized.where(normalized.isin(MJOB_CATEGORIES), "other")

    if "Mjob" in raw.columns:
        df["Mjob"] = normalize_job(raw["Mjob"])
    else:
        df["Mjob"] = "other"

    if "Fjob" in raw.columns:
        df["Fjob"] = normalize_job(raw["Fjob"])
    else:
        df["Fjob"] = "other"

    if "activities" in raw.columns:
        activities = raw["activities"].fillna("no").astype(str).str.lower().str.strip()
        df["activities"] = activities.where(activities.isin(ACTIVITIES_CATEGORIES), "no")
    else:
        df["activities"] = "no"

    df[LABEL_COL] = pd.to_numeric(raw["G3"], errors="raise").clip(0, 20).mul(5)

    df = df[FEATURE_ORDER + [LABEL_COL]].copy()
    return df


def load_dataset(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    missing = [c for c in FEATURE_ORDER + [LABEL_COL] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing columns: {missing}")

    df = df[FEATURE_ORDER + [LABEL_COL]].copy()
    for col in NUMERICAL_FEATURES:
        df[col] = pd.to_numeric(df[col], errors="raise")
    for col in CATEGORICAL_FEATURES:
        df[col] = df[col].astype(str)

    df[LABEL_COL] = pd.to_numeric(df[LABEL_COL], errors="raise")
    return df


def train_model(df: pd.DataFrame) -> dict:
    X = df[FEATURE_ORDER]
    y = df[LABEL_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_SEED,
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", NUMERICAL_FEATURES),
            (
                "cat",
                OrdinalEncoder(
                    categories=[MJOB_CATEGORIES, FJOB_CATEGORIES, ACTIVITIES_CATEGORIES],
                    handle_unknown="use_encoded_value",
                    unknown_value=-1,
                ),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="drop",
    )

    model = RandomForestRegressor(
        n_estimators=300,
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )

    pipeline = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", model),
        ]
    )

    pipeline.fit(X_train, y_train)

    preds = pipeline.predict(X_test) if len(X_test) else np.array(y_test)
    r2 = float(r2_score(y_test, preds)) if len(X_test) else 1.0
    mae = float(mean_absolute_error(y_test, preds)) if len(X_test) else 0.0
    rmse = float(np.sqrt(mean_squared_error(y_test, preds))) if len(X_test) else 0.0

    bundle = {
        "model": pipeline,
        "meta": {
            "feature_order": FEATURE_ORDER,
            "numerical_features": NUMERICAL_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "label_col": LABEL_COL,
            "model_version": MODEL_VERSION,
            "random_seed": RANDOM_SEED,
            "test_r2": r2,
            "test_mae": mae,
            "test_rmse": rmse,
        },
    }
    return bundle


def predict(
    model: Pipeline | dict,
    *,
    G1: float,
    G2: float,
    grade_8_score: float,
    grade_9_score: float,
    grade_10_score: float,
    traveltime: int,
    absences: int,
    Mjob: str,
    Fjob: str,
    activities: str,
) -> float:
    if isinstance(model, dict):
        model = model.get("model")

    row = pd.DataFrame(
        [
            {
                "G1": G1,
                "G2": G2,
                "grade_8_score": grade_8_score,
                "grade_9_score": grade_9_score,
                "grade_10_score": grade_10_score,
                "traveltime": traveltime,
                "absences": absences,
                "Mjob": Mjob,
                "Fjob": Fjob,
                "activities": activities,
            }
        ],
        columns=FEATURE_ORDER,
    )

    pred = float(model.predict(row)[0])
    return float(np.clip(pred, 0, 100))


def main() -> None:
    base = Path(__file__).resolve().parent

    # Raw sources (provided in this repo)
    raw_sources = [
        Path(r"C:\Users\user\Desktop\CMS\ml-service\cms data\mat2_enhanced.csv"),
        Path(r"C:\Users\user\Desktop\CMS\ml-service\cms data\por2_enhanced.csv"),
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
