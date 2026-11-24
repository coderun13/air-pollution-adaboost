import json
from pathlib import Path
from typing import Literal, Optional
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# --------------------------------------------------
# PATHS & CONSTANTS
# --------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = PROJECT_ROOT / "models" / "adaboost_aqi_classifier.joblib"
LIVE_PREDS_CSV = PROJECT_ROOT / "data" / "processed" / "wb_live_ml_predictions.csv"
LIVE_SNAPSHOT_CSV = PROJECT_ROOT / "data" / "processed" / "wb_station_snapshot.csv"
METRICS_CSV = PROJECT_ROOT / "reports" / "models" / "model_comparison_metrics.csv"
FI_CSV = PROJECT_ROOT / "reports" / "models" / "adaboost_feature_importances.csv"

FEATURES = ["PM2_5", "PM10", "NO2", "SO2", "CO", "O3", "NH3"]
LIVE_TO_MODEL_COL_MAP = {
    "PM2.5_avg": "PM2_5",
    "PM10_avg": "PM10",
    "NO2_avg": "NO2",
    "SO2_avg": "SO2",
    "CO_avg": "CO",
    "OZONE_avg": "O3",
    "NH3_avg": "NH3",
}

app = FastAPI(
    title="AIRWATCH AI API",
    description="Real-time West Bengal air quality monitoring and AdaBoost AQI classification API.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PollutantInput(BaseModel):
    PM2_5: float = Field(..., ge=0, description="PM2.5 concentration")
    PM10: float = Field(..., ge=0, description="PM10 concentration")
    NO2: float = Field(..., ge=0, description="NO2 concentration")
    SO2: float = Field(..., ge=0, description="SO2 concentration")
    CO: float = Field(..., ge=0, description="CO concentration")
    O3: float = Field(..., ge=0, description="Ozone concentration")
    NH3: float = Field(..., ge=0, description="NH3 concentration")
    co_unit: Literal["auto", "mg/m3", "ug/m3"] = Field(
        default="auto",
        description="Use 'auto' to convert CO > 50 from ug/m3 to mg/m3 (dividing by 1000).",
    )


def normalize_co(val: float, unit: str) -> float:
    if unit == "ug/m3":
        return float(val) / 1000.0
    if unit == "mg/m3":
        return float(val)
    return float(val) / 1000.0 if float(val) > 50.0 else float(val)


def load_model_bundle():
    if not MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail=f"Model artifact not found at {MODEL_PATH}")
    bundle = joblib.load(MODEL_PATH)
    if isinstance(bundle, dict) and "model" in bundle:
        return bundle["model"], bundle.get("features", FEATURES), list(bundle["model"].classes_)
    return bundle, FEATURES, list(bundle.classes_)


@app.get("/health")
def health_check():
    model_exists = MODEL_PATH.exists()
    live_exists = LIVE_PREDS_CSV.exists() or LIVE_SNAPSHOT_CSV.exists()
    return {
        "status": "ok",
        "model_loaded": model_exists,
        "live_data_available": live_exists,
        "features": FEATURES,
    }


@app.get("/stations/live")
def get_live_stations(city: Optional[str] = Query(default=None, description="Filter by city name")):
    source_csv = LIVE_PREDS_CSV if LIVE_PREDS_CSV.exists() else LIVE_SNAPSHOT_CSV
    if not source_csv.exists():
        raise HTTPException(status_code=404, detail="Processed station snapshot CSV not found.")

    df = pd.read_csv(source_csv)
    if city and "city" in df.columns:
        df = df[df["city"].astype(str).str.lower() == city.strip().lower()]

    # Recompute/refresh ML predictions with normalized CO when all 7 features exist
    if MODEL_PATH.exists():
        model, feat_cols, classes = load_model_bundle()
        mapped = pd.DataFrame(index=df.index)
        for lcol, mcol in LIVE_TO_MODEL_COL_MAP.items():
            mapped[mcol] = pd.to_numeric(df.get(lcol), errors="coerce")
        mapped["CO"] = mapped["CO"].apply(lambda v: normalize_co(v, "auto") if pd.notna(v) else np.nan)

        valid_mask = mapped[feat_cols].notna().all(axis=1)
        df["ml_predicted_category"] = None
        df["ml_confidence"] = None
        if valid_mask.any():
            preds = model.predict(mapped.loc[valid_mask, feat_cols])
            probs = model.predict_proba(mapped.loc[valid_mask, feat_cols])
            cls_to_idx = {c: i for i, c in enumerate(classes)}
            df.loc[valid_mask, "ml_predicted_category"] = preds
            df.loc[valid_mask, "ml_confidence"] = [
                round(float(probs[i, cls_to_idx[p]]), 4) for i, p in enumerate(preds)
            ]

    clean_records = json.loads(df.where(pd.notna(df), None).to_json(orient="records"))
    return {
        "count": len(clean_records),
        "source_file": source_csv.name,
        "disclaimer": "ML category is a model prediction from historical training data, not an official CPCB AQI bulletin.",
        "stations": clean_records,
    }


@app.get("/models/metrics")
def get_model_metrics():
    if not METRICS_CSV.exists():
        raise HTTPException(status_code=404, detail="Model metrics CSV not found. Run train_models.py first.")

    metrics_df = pd.read_csv(METRICS_CSV)
    fi_records = []
    if FI_CSV.exists():
        fi_df = pd.read_csv(FI_CSV)
        fi_records = json.loads(fi_df.where(pd.notna(fi_df), None).to_json(orient="records"))

    return {
        "models": json.loads(metrics_df.where(pd.notna(metrics_df), None).to_json(orient="records")),
        "adaboost_feature_importances": fi_records,
    }


@app.post("/predict")
def predict_aqi_category(payload: PollutantInput):
    model, feat_cols, classes = load_model_bundle()

    row = {
        "PM2_5": payload.PM2_5,
        "PM10": payload.PM10,
        "NO2": payload.NO2,
        "SO2": payload.SO2,
        "CO": normalize_co(payload.CO, payload.co_unit),
        "O3": payload.O3,
        "NH3": payload.NH3,
    }
    X_in = pd.DataFrame([row])[feat_cols]
    pred_class = str(model.predict(X_in)[0])
    probs = model.predict_proba(X_in)[0]

    prob_map = {str(cls): round(float(p), 4) for cls, p in zip(classes, probs)}
    return {
        "predicted_aqi_category": pred_class,
        "confidence": prob_map.get(pred_class),
        "class_probabilities": prob_map,
        "normalized_features_used": row,
        "disclaimer": "Model-predicted category based on AdaBoost classifier; not an official CPCB AQI reading.",
    }