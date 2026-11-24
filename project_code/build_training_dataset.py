import json
from pathlib import Path
import numpy as np
import pandas as pd

# --------------------------------------------------
# PATHS
# --------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent
INPUT_CSV = PROJECT_ROOT / "data" / "external" / "kaggle_india_aqi" / "station_day.csv"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
OUTPUT_CSV = PROCESSED_DIR / "station_day_ml_dataset.csv"
REPORT_JSON = PROCESSED_DIR / "station_day_ml_report.json"

FEATURE_MAP = {
    "PM2.5": "PM2_5",
    "PM10": "PM10",
    "NO2": "NO2",
    "SO2": "SO2",
    "CO": "CO",
    "O3": "O3",
    "NH3": "NH3",
}
STANDARD_FEATURES = list(FEATURE_MAP.values())
TARGET_ORDER = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]

# CPCB Breakpoints: (B_low, B_high, I_low, I_high)
# PM2.5, PM10, NO2, NH3, SO2, O3 in ug/m3; CO in mg/m3
CPCB_BREAKPOINTS = {
    "PM2_5": [
        (0.0, 30.0, 0, 50),
        (30.1, 60.0, 51, 100),
        (60.1, 90.0, 101, 200),
        (90.1, 120.0, 201, 300),
        (120.1, 250.0, 301, 400),
        (250.1, 500.0, 401, 500),
    ],
    "PM10": [
        (0.0, 50.0, 0, 50),
        (50.1, 100.0, 51, 100),
        (100.1, 250.0, 101, 200),
        (250.1, 350.0, 201, 300),
        (350.1, 430.0, 301, 400),
        (430.1, 1000.0, 401, 500),
    ],
    "NO2": [
        (0.0, 40.0, 0, 50),
        (40.1, 80.0, 51, 100),
        (80.1, 180.0, 101, 200),
        (180.1, 280.0, 201, 300),
        (280.1, 400.0, 301, 400),
        (400.1, 1000.0, 401, 500),
    ],
    "NH3": [
        (0.0, 200.0, 0, 50),
        (200.1, 400.0, 51, 100),
        (400.1, 800.0, 101, 200),
        (800.1, 1200.0, 201, 300),
        (1200.1, 1800.0, 301, 400),
        (1800.1, 5000.0, 401, 500),
    ],
    "SO2": [
        (0.0, 40.0, 0, 50),
        (40.1, 80.0, 51, 100),
        (80.1, 380.0, 101, 200),
        (380.1, 800.0, 201, 300),
        (800.1, 1600.0, 301, 400),
        (1600.1, 5000.0, 401, 500),
    ],
    "O3": [
        (0.0, 50.0, 0, 50),
        (50.1, 100.0, 51, 100),
        (100.1, 168.0, 101, 200),
        (168.1, 208.0, 201, 300),
        (208.1, 748.0, 301, 400),
        (748.1, 1500.0, 401, 500),
    ],
    "CO": [
        (0.0, 1.0, 0, 50),
        (1.1, 2.0, 51, 100),
        (2.1, 10.0, 101, 200),
        (10.1, 17.0, 201, 300),
        (17.1, 34.0, 301, 400),
        (34.1, 100.0, 401, 500),
    ],
}


def compute_sub_index(feat: str, val: float) -> float:
    if pd.isna(val) or val < 0:
        return np.nan
    conc = float(val) / 1000.0 if (feat == "CO" and val > 50.0) else float(val)
    bands = CPCB_BREAKPOINTS[feat]
    for b_lo, b_hi, i_lo, i_hi in bands:
        if b_lo <= conc <= b_hi:
            return round(((i_hi - i_lo) / (b_hi - b_lo)) * (conc - b_lo) + i_lo, 2)
    return float(bands[-1][3])


def score_to_category(score: float) -> str | None:
    if pd.isna(score):
        return None
    if score <= 50:
        return "Good"
    elif score <= 100:
        return "Satisfactory"
    elif score <= 200:
        return "Moderate"
    elif score <= 300:
        return "Poor"
    elif score <= 400:
        return "Very Poor"
    else:
        return "Severe"


def main() -> None:
    if not INPUT_CSV.exists():
        raise FileNotFoundError(f"Missing {INPUT_CSV}. Extract station_day.csv first.")

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    raw_df = pd.read_csv(INPUT_CSV, low_memory=False)
    initial_rows = len(raw_df)

    # Deduplicate exact rows and logical (Station, Datetime) rows if present
    exact_dups = int(raw_df.duplicated().sum())
    df = raw_df.drop_duplicates().copy()

    df["datetime_parsed"] = pd.to_datetime(df["Datetime"], errors="coerce")
    df = df.dropna(subset=["datetime_parsed", "Station"]).sort_values(["Station", "datetime_parsed"])

    logical_dups = int(df.duplicated(subset=["Station", "datetime_parsed"]).sum())
    df = df.drop_duplicates(subset=["Station", "datetime_parsed"], keep="first").copy()

    # Standardize pollutant feature names and numeric types
    for raw_col, std_col in FEATURE_MAP.items():
        if raw_col in df.columns:
            df[std_col] = pd.to_numeric(df[raw_col], errors="coerce")
            # Remove impossible negative pollutant readings
            df.loc[df[std_col] < 0, std_col] = np.nan
        else:
            df[std_col] = np.nan

    # Compute CPCB sub-indices
    sub_cols = []
    for feat in STANDARD_FEATURES:
        sub_col = f"subidx_{feat}"
        sub_cols.append(sub_col)
        df[sub_col] = df[feat].apply(lambda v: compute_sub_index(feat, v))

    sub_matrix = df[sub_cols]
    sub_count = sub_matrix.notna().sum(axis=1)
    has_pm = df[["PM2_5", "PM10"]].notna().any(axis=1)

    # CPCB sufficiency: >= 3 sub-indices including PM2_5 or PM10
    df["cpcb_sufficient"] = (sub_count >= 3) & has_pm
    df["derived_aqi"] = np.where(df["cpcb_sufficient"], sub_matrix.max(axis=1), np.nan)
    df["aqi_category"] = df["derived_aqi"].apply(score_to_category)

    # Filter to rows with a valid derived target & complete core features
    ready_df = df.dropna(subset=["aqi_category"] + STANDARD_FEATURES).copy()
    ready_df["date"] = ready_df["datetime_parsed"].dt.strftime("%Y-%m-%d")

    output_cols = [
        "City",
        "Station",
        "date",
        *STANDARD_FEATURES,
        "derived_aqi",
        "aqi_category",
    ]
    if "AQI_Bucket" in ready_df.columns:
        output_cols.append("raw_archive_aqi_bucket_audit")
        ready_df["raw_archive_aqi_bucket_audit"] = ready_df["AQI_Bucket"]

    final_df = ready_df[output_cols].reset_index(drop=True)
    final_df.to_csv(OUTPUT_CSV, index=False)

    class_counts = {
        cls: int((final_df["aqi_category"] == cls).sum())
        for cls in TARGET_ORDER
    }
    bucket_mismatch = None
    if "raw_archive_aqi_bucket_audit" in final_df.columns:
        bucket_mismatch = int(
            (final_df["aqi_category"].astype(str) != final_df["raw_archive_aqi_bucket_audit"].astype(str)).sum()
        )

    report = {
        "source_file": str(INPUT_CSV),
        "initial_rows": int(initial_rows),
        "exact_duplicates_removed": exact_dups,
        "logical_station_date_duplicates_removed": logical_dups,
        "cpcb_sufficient_rows_before_feature_dropna": int(df["cpcb_sufficient"].sum()),
        "final_complete_training_rows": int(len(final_df)),
        "features": STANDARD_FEATURES,
        "target": "aqi_category",
        "class_distribution": class_counts,
        "mismatch_vs_raw_AQI_Bucket": bucket_mismatch,
    }

    with open(REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("=== TASK 5: TRAINING DATASET PIPELINE SUMMARY ===")
    print(f"Initial rows                 : {initial_rows:,}")
    print(f"Exact / Logical dups removed : {exact_dups:,} / {logical_dups:,}")
    print(f"CPCB-sufficient rows         : {int(df['cpcb_sufficient'].sum()):,}")
    print(f"Complete rows (all 7 feats)  : {len(final_df):,}")
    print(f"Saved dataset                : {OUTPUT_CSV}")
    print(f"Saved report                 : {REPORT_JSON}")
    print("\nTarget class distribution (aqi_category):")
    for cls, cnt in class_counts.items():
        pct = (cnt / len(final_df) * 100) if len(final_df) else 0.0
        print(f"  {cls:14s}: {cnt:6,d} ({pct:5.2f}%)")
    if bucket_mismatch is not None:
        print(f"\nRows where CPCB aqi_category != raw AQI_Bucket: {bucket_mismatch:,} / {len(final_df):,}")


if __name__ == "__main__":
    main()