from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


logger = logging.getLogger("ml-services")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "random_forest.pkl"


FEATURE_ORDER: List[str] = [
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


class PredictRequest(BaseModel):
    G1: float = Field(..., ge=0, le=20)
    G2: float = Field(..., ge=0, le=20)
    grade_8_score: float = Field(..., ge=0, le=20)
    grade_9_score: float = Field(..., ge=0, le=20)
    grade_10_score: float = Field(..., ge=0, le=20)
    traveltime: int = Field(..., ge=1, le=4)
    absences: int = Field(..., ge=0, le=93)
    Mjob: str
    Fjob: str
    activities: str


class PredictResponse(BaseModel):
    predicted_grade: float


def load_bundle(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(
            f"Model file not found at {path}. Run: python train.py"
        )
    bundle = joblib.load(path)
    if not isinstance(bundle, dict) or "model" not in bundle or "meta" not in bundle:
        raise ValueError("Invalid model bundle format")
    return bundle


app = FastAPI(title="Student Performance ML Service", version="1.0.0")

MODEL_BUNDLE: Optional[Dict[str, Any]] = None


@app.on_event("startup")
def _startup() -> None:
    global MODEL_BUNDLE
    MODEL_BUNDLE = load_bundle(MODEL_PATH)
    meta = MODEL_BUNDLE.get("meta", {})
    logger.info(
        "Loaded model: version=%s features=%s",
        meta.get("model_version"),
        meta.get("feature_order"),
    )


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    if MODEL_BUNDLE is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    model = MODEL_BUNDLE["model"]
    meta = MODEL_BUNDLE.get("meta", {})
    expected = meta.get("feature_order") or FEATURE_ORDER

    payload = req.model_dump()
    try:
        row = [payload[name] for name in expected]
        x = pd.DataFrame([row], columns=list(expected))
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Missing feature: {e}")

    try:
        value = float(model.predict(x)[0])
        pred = max(0.0, min(100.0, value))

        logger.info("predict ok grade=%s", pred)
        return PredictResponse(predicted_grade=pred)
    except Exception as e:
        logger.exception("predict failed")
        raise HTTPException(status_code=500, detail="Prediction failed") from e
