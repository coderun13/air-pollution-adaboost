import json
from pathlib import Path
import pandas as pd

# --------------------------------------------------
# PATHS
# --------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent
DATA_CSV = PROJECT_ROOT / "data" / "processed" / "station_day_ml_dataset.csv"
OUT_DIR = PROJECT_ROOT / "reports" / "eda"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_JSON = OUT_DIR / "task6_ml_dataset_analysis.json"

FEATURES = ["PM2_5", "PM10", "NO2", "SO2", "CO", "O3", "NH3"]
TARGET = "aqi_category"
CLASS_ORDER = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]


def main() -> None:
    if not DATA_CSV.exists():
        raise FileNotFoundError(f"Missing {DATA_CSV}. Run build_training_dataset.py first.")

    df = pd.read_csv(DATA_CSV)
    df["date_parsed"] = pd.to_datetime(df["date"], errors="coerce")

    print("=== TASK 6: RESEARCH & INITIAL ML DATASET ANALYSIS ===")
    print(f"Total rows      : {len(df):,}")
    print(f"Date range      : {df['date_parsed'].min().date()} -> {df['date_parsed'].max().date()}")
    print(f"Cities ({df['City'].nunique()})    : {sorted(df['City'].dropna().unique().tolist())}")
    print(f"Stations ({df['Station'].nunique()}): {sorted(df['Station'].dropna().unique().tolist())}")

    # 1. Feature summary statistics
    feat_stats = df[FEATURES].describe(percentiles=[0.05, 0.25, 0.5, 0.75, 0.95]).T.round(3)
    feat_stats.to_csv(OUT_DIR / "ml_features_summary.csv")
    print("\n--- 1. Feature Summary Statistics ---")
    print(feat_stats[["count", "mean", "std", "min", "50%", "max"]].to_string())

    # 2. Target class counts & percentages
    total = len(df)
    class_rows = []
    for cls in CLASS_ORDER:
        cnt = int((df[TARGET] == cls).sum())
        class_rows.append({
            "aqi_category": cls,
            "count": cnt,
            "pct": round(cnt / total * 100, 4) if total else 0.0,
        })
    class_df = pd.DataFrame(class_rows)
    class_df.to_csv(OUT_DIR / "ml_target_distribution.csv", index=False)
    print("\n--- 2. Target Class Distribution ---")
    print(class_df.to_string(index=False))

    # 3. Mean feature values per target class
    class_means = df.groupby(TARGET, dropna=False)[FEATURES].mean().round(2)
    ordered_present = [c for c in CLASS_ORDER if c in class_means.index]
    class_means = class_means.loc[ordered_present]
    class_means.to_csv(OUT_DIR / "ml_feature_means_by_class.csv")
    print("\n--- 3. Mean Feature Values by AQI Category ---")
    print(class_means.to_string())

    # 4. Station & yearly counts (for split planning)
    station_counts = df["Station"].value_counts().to_dict()
    year_counts = df["date_parsed"].dt.year.value_counts().sort_index().to_dict()

    analysis_payload = {
        "rows": int(len(df)),
        "date_min": str(df["date_parsed"].min().date()),
        "date_max": str(df["date_parsed"].max().date()),
        "cities": sorted(df["City"].dropna().unique().tolist()),
        "stations": sorted(df["Station"].dropna().unique().tolist()),
        "rows_per_station": {k: int(v) for k, v in station_counts.items()},
        "rows_per_year": {int(k): int(v) for k, v in year_counts.items()},
        "target_distribution": class_rows,
    }
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(analysis_payload, f, indent=2)

    print(f"\nSaved Task 6 analysis -> {OUT_JSON}")


if __name__ == "__main__":
    main()