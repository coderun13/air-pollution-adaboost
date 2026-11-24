from pathlib import Path
import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
TRAIN_CSV = ROOT / "data" / "processed" / "station_day_ml_dataset.csv"
LIVE_CSV = ROOT / "data" / "processed" / "wb_station_snapshot.csv"
MODEL_PATH = ROOT / "models" / "adaboost_aqi_classifier.joblib"

FEATURES = ["PM2_5", "PM10", "NO2", "SO2", "CO", "O3", "NH3"]
LIVE_MAP = {
    "PM2.5_avg": "PM2_5",
    "PM10_avg": "PM10",
    "NO2_avg": "NO2",
    "SO2_avg": "SO2",
    "CO_avg": "CO",
    "OZONE_avg": "O3",
    "NH3_avg": "NH3",
}

train_df = pd.read_csv(TRAIN_CSV)
live_df = pd.read_csv(LIVE_CSV)

mapped = pd.DataFrame(index=live_df.index)
for lcol, mcol in LIVE_MAP.items():
    mapped[mcol] = pd.to_numeric(live_df.get(lcol), errors="coerce")

print("=== TRAINING DATA FEATURE RANGES (min / median / max) ===")
print(train_df[FEATURES].agg(["min", "median", "max"]).round(2).to_string())

print("\n=== LIVE SNAPSHOT RAW MAPPED RANGES (min / median / max) ===")
print(mapped[FEATURES].agg(["min", "median", "max"]).round(2).to_string())

bundle = joblib.load(MODEL_PATH)
model = bundle["model"] if isinstance(bundle, dict) else bundle

# Test with CO converted from ug/m3 -> mg/m3 (dividing by 1000)
mapped_co_scaled = mapped.copy()
mapped_co_scaled["CO"] = mapped_co_scaled["CO"] / 1000.0

valid = mapped_co_scaled.dropna()
preds = model.predict(valid[FEATURES])
probs = model.predict_proba(valid[FEATURES])
max_probs = probs.max(axis=1)

out = pd.DataFrame({
    "city": live_df.loc[valid.index, "city"],
    "station": live_df.loc[valid.index, "station"],
    "PM2_5": valid["PM2_5"],
    "CO_scaled": valid["CO"].round(4),
    "pred_class": preds,
    "confidence": np.round(max_probs, 4),
})
print("\n=== LIVE PREDICTIONS WITH CO / 1000 ===")
print(out.to_string(index=False))