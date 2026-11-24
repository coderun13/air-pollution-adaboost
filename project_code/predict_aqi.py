import json
from pathlib import Path
from typing import Literal
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import AdaBoostClassifier
from sklearn.tree import DecisionTreeClassifier

# --------------------------------------------------
# PATHS
# --------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent
TRAIN_CSV = PROJECT_ROOT / "data" / "processed" / "station_day_ml_dataset.csv"
LIVE_CSV = PROJECT_ROOT / "data" / "processed" / "wb_station_snapshot.csv"
MODEL_DIR = PROJECT_ROOT / "models"
MODEL_PATH = MODEL_DIR / "adaboost_aqi_classifier.joblib"
LIVE_PREDS_CSV = PROJECT_ROOT / "data" / "processed" / "wb_live_ml_predictions.csv"

FEATURES = ["PM2_5", "PM10", "NO2", "SO2", "CO", "O3", "NH3"]
TARGET = "aqi_category"

LIVE_TO_MODEL_COL_MAP = {
    "PM2.5_avg": "PM2_5",
    "PM10_avg": "PM10",
    "NO2_avg": "NO2",
    "SO2_avg": "SO2",
    "CO_avg": "CO",
    "OZONE_avg": "O3",
    "NH3_avg": "NH3",
}


def normalize_co(val: float, unit: Literal["auto", "mg/m3", "ug/m3"] = "auto") -> float:
    """Align CO with mg/m3 scale used in training."""
    if pd.isna(val):
        return np.nan
    v = float(val)
    if unit == "ug/m3":
        return v / 1000.0
    if unit == "mg/m3":
        return v
    return v / 1000.0 if v > 50.0 else v


def train_and_save_model(train_csv: Path, model_path: Path) -> AdaBoostClassifier:
    if not train_csv.exists():
        raise FileNotFoundError(
            f"Training dataset not found at {train_csv}. Run build_training_dataset.py first."
        )

    df = pd.read_csv(train_csv)
    df = df.dropna(subset=FEATURES + [TARGET]).copy()

    X = df[FEATURES]
    y = df[TARGET]

    model = AdaBoostClassifier(
        estimator=DecisionTreeClassifier(max_depth=3, random_state=42),
        n_estimators=100,
        learning_rate=0.5,
        random_state=42,
    )
    model.fit(X, y)

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "features": FEATURES,
            "classes_": list(model.classes_),
        },
        model_path,
    )
    print(f"Trained & saved AdaBoost model -> {model_path}")
    return model


def load_model(model_path: Path) -> AdaBoostClassifier:
    if model_path.exists():
        bundle = joblib.load(model_path)
        if isinstance(bundle, dict) and "model" in bundle:
            return bundle["model"]
        return bundle
    return train_and_save_model(TRAIN_CSV, model_path)


def predict_from_records(
    model: AdaBoostClassifier,
    records: list[dict],
    co_unit: Literal["auto", "mg/m3", "ug/m3"] = "auto",
) -> list[dict]:
    X_input = pd.DataFrame(records)[FEATURES].apply(pd.to_numeric, errors="coerce")
    X_input["CO"] = X_input["CO"].apply(lambda v: normalize_co(v, co_unit))

    preds = model.predict(X_input)
    probs = model.predict_proba(X_input) if hasattr(model, "predict_proba") else None

    results = []
    for idx, row in enumerate(records):
        item = dict(row)
        item["CO_normalized"] = None if pd.isna(X_input.iloc[idx]["CO"]) else round(float(X_input.iloc[idx]["CO"]), 4)
        pred_cls = str(preds[idx])
        item["predicted_aqi_category"] = pred_cls
        if probs is not None:
            cls_idx = list(model.classes_).index(preds[idx])
            item["prediction_confidence"] = round(float(probs[idx][cls_idx]), 4)
        else:
            item["prediction_confidence"] = None
        results.append(item)
    return results


def run_live_snapshot_inference(
    model: AdaBoostClassifier,
    live_csv: Path,
    out_csv: Path,
    co_unit: Literal["auto", "mg/m3", "ug/m3"] = "auto",
) -> None:
    if not live_csv.exists():
        print(f"Live snapshot CSV not found at {live_csv}; skipping live batch inference.")
        return

    live_df = pd.read_csv(live_csv).copy()
    mapped_df = pd.DataFrame(index=live_df.index)
    for live_col, model_col in LIVE_TO_MODEL_COL_MAP.items():
        mapped_df[model_col] = pd.to_numeric(live_df.get(live_col), errors="coerce")

    mapped_df["CO"] = mapped_df["CO"].apply(lambda v: normalize_co(v, co_unit))
    live_df["CO_normalized"] = mapped_df["CO"].round(4)

    complete_mask = mapped_df[FEATURES].notna().all(axis=1)
    live_df["ml_predicted_category"] = pd.NA
    live_df["ml_confidence"] = np.nan

    if complete_mask.any():
        X_complete = mapped_df.loc[complete_mask, FEATURES]
        preds = model.predict(X_complete)
        live_df.loc[complete_mask, "ml_predicted_category"] = preds
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_complete)
            class_to_idx = {c: i for i, c in enumerate(model.classes_)}
            confs = [round(float(probs[i, class_to_idx[p]]), 4) for i, p in enumerate(preds)]
            live_df.loc[complete_mask, "ml_confidence"] = confs

    live_df.to_csv(out_csv, index=False)
    print(f"\nSaved live snapshot predictions -> {out_csv}")
    preview_cols = [
        c
        for c in [
            "city",
            "station",
            "last_update_iso",
            "PM2.5_avg",
            "CO_avg",
            "CO_normalized",
            "ml_predicted_category",
            "ml_confidence",
        ]
        if c in live_df.columns
    ]
    print(live_df[preview_cols].head(10).to_string(index=False))


def main() -> None:
    model = train_and_save_model(TRAIN_CSV, MODEL_PATH)

    sample_inputs = [
        {"PM2_5": 35.0, "PM10": 65.0, "NO2": 22.0, "SO2": 12.0, "CO": 0.65, "O3": 28.0, "NH3": 10.0},
        {"PM2_5": 115.0, "PM10": 195.0, "NO2": 55.0, "SO2": 24.0, "CO": 1400.0, "O3": 42.0, "NH3": 18.0},
    ]
    sample_preds = predict_from_records(model, sample_inputs, co_unit="auto")
    print("\n=== SAMPLE INFERENCE CHECK (WITH CO NORMALIZATION) ===")
    print(json.dumps(sample_preds, indent=2))

    run_live_snapshot_inference(model, LIVE_CSV, LIVE_PREDS_CSV, co_unit="auto")


if __name__ == "__main__":
    main()