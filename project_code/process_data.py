import json
from pathlib import Path
import pandas as pd

# --------------------------------------------------
# PATHS
# --------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent
RAW_FILE = PROJECT_ROOT / "data" / "raw" / "wb_aqi_raw.json"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
OUTPUT_FILE = PROCESSED_DIR / "wb_station_snapshot.csv"
REPORT_FILE = PROCESSED_DIR / "wb_data_quality_report.json"

POLLUTANTS = ["PM2.5", "PM10", "NO2", "SO2", "NH3", "OZONE", "CO"]
METRICS = ["min", "avg", "max"]
MISSING_TOKENS = {"", "na", "n/a", "null", "none", "nan", "-"}


# --------------------------------------------------
# 1. LOAD RAW DATA
# --------------------------------------------------
def load_records(filepath: Path) -> list[dict]:
    with open(filepath, "r", encoding="utf-8") as f:
        payload = json.load(f)

    if isinstance(payload, list):
        records = payload
    elif isinstance(payload, dict):
        records = payload.get("records", [])
    else:
        raise ValueError("Unexpected JSON structure in raw snapshot")

    if not isinstance(records, list) or len(records) == 0:
        raise ValueError("No records found in raw snapshot")

    print(f"Loaded raw records: {len(records)}")
    return records


# --------------------------------------------------
# 2 & 3. NORMALIZE TYPES AND TIMESTAMPS
# --------------------------------------------------
def normalize_records(records: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(records).copy()

    string_cols = ["country", "state", "city", "station", "pollutant_id", "last_update"]
    for col in string_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
            df.loc[df[col].str.lower().isin(MISSING_TOKENS), col] = pd.NA

    for coord_col in ["latitude", "longitude"]:
        if coord_col in df.columns:
            df[coord_col] = pd.to_numeric(df[coord_col], errors="coerce")

    for val_col in ["min_value", "avg_value", "max_value"]:
        if val_col in df.columns:
            cleaned = df[val_col].astype(str).str.strip()
            cleaned = cleaned.where(~cleaned.str.lower().isin(MISSING_TOKENS), other=pd.NA)
            df[val_col] = pd.to_numeric(cleaned, errors="coerce")

    df["pollutant_id"] = df["pollutant_id"].str.upper()

    # Parse timestamps (primary format DD-MM-YYYY HH:MM:SS)
    parsed_ts = pd.to_datetime(df["last_update"], format="%d-%m-%Y %H:%M:%S", errors="coerce")
    fallback_mask = parsed_ts.isna() & df["last_update"].notna()
    if fallback_mask.any():
        parsed_ts.loc[fallback_mask] = pd.to_datetime(
            df.loc[fallback_mask, "last_update"], errors="coerce"
        )
    df["last_update_dt"] = parsed_ts
    df["last_update_iso"] = parsed_ts.dt.strftime("%Y-%m-%d %H:%M:%S")

    return df


# --------------------------------------------------
# 4, 5 & 6. GROUP BY STATION + TIME & PIVOT POLLUTANTS
# --------------------------------------------------
def build_station_snapshot(df: pd.DataFrame) -> pd.DataFrame:
    id_cols = ["country", "state", "city", "station", "last_update_iso"]

    # Check if any duplicate (station, last_update, pollutant_id) rows exist before pivoting
    dup_mask = df.duplicated(subset=["station", "last_update_iso", "pollutant_id"], keep=False)
    if dup_mask.any():
        df = (
            df.groupby(id_cols + ["latitude", "longitude", "pollutant_id"], dropna=False, as_index=False)[
                ["min_value", "avg_value", "max_value"]
            ]
            .mean(numeric_only=True)
        )

    # Metadata per station + timestamp
    meta_df = (
        df.groupby(id_cols, dropna=False, as_index=False)
        .agg(
            latitude=("latitude", "first"),
            longitude=("longitude", "first"),
            pollutants_reported=("pollutant_id", "nunique"),
            valid_avg_count=("avg_value", lambda s: int(s.notna().sum())),
        )
    )

    # Pivot min_value, avg_value, max_value across pollutant_id
    pivoted = df.pivot(
        index=id_cols,
        columns="pollutant_id",
        values=["min_value", "avg_value", "max_value"],
    )

    # Flatten MultiIndex columns into clean names like PM2.5_avg, PM2.5_min, PM2.5_max
    pivoted.columns = [
        f"{pollutant}_{metric.replace('_value', '')}"
        for metric, pollutant in pivoted.columns
    ]
    pivoted = pivoted.reset_index()

    wide_df = pd.merge(meta_df, pivoted, on=id_cols, how="left")

    # Enforce consistent column ordering across pollutants and metrics
    pollutant_cols = []
    for p in POLLUTANTS:
        for m in METRICS:
            col_name = f"{p}_{m}"
            if col_name not in wide_df.columns:
                wide_df[col_name] = float("nan")
            pollutant_cols.append(col_name)

    # Also include any unexpected pollutant columns if they ever appear
    extra_pollutant_cols = sorted(
        c for c in wide_df.columns
        if any(c.endswith(f"_{m}") for m in METRICS) and c not in pollutant_cols
    )

    ordered_cols = [
        "country",
        "state",
        "city",
        "station",
        "latitude",
        "longitude",
        "last_update_iso",
        "pollutants_reported",
        "valid_avg_count",
        *pollutant_cols,
        *extra_pollutant_cols,
    ]

    wide_df = wide_df[ordered_cols].sort_values(["city", "station", "last_update_iso"]).reset_index(drop=True)
    return wide_df


# --------------------------------------------------
# 7. VALIDATE FINAL TABLE & WRITE QUALITY REPORT
# --------------------------------------------------
def validate_and_report(raw_df: pd.DataFrame, wide_df: pd.DataFrame) -> dict:
    missing_by_col = {col: int(wide_df[col].isna().sum()) for col in wide_df.columns}
    pollutant_cols = [
        col for col in wide_df.columns if any(col.endswith(f"_{m}") for m in METRICS)
    ]
    avg_cols = [col for col in pollutant_cols if col.endswith("_avg")]

    # Check for negative concentrations or min > max violations
    negative_violations = {}
    range_violations = {}

    for p in POLLUTANTS:
        c_min, c_avg, c_max = f"{p}_min", f"{p}_avg", f"{p}_max"
        for c in (c_min, c_avg, c_max):
            if c in wide_df.columns:
                neg_cnt = int((wide_df[c].dropna() < 0).sum())
                if neg_cnt > 0:
                    negative_violations[c] = neg_cnt

        if c_min in wide_df.columns and c_max in wide_df.columns:
            both = wide_df[[c_min, c_max]].dropna()
            bad_range = int((both[c_min] > both[c_max]).sum())
            if bad_range > 0:
                range_violations[p] = bad_range

    report = {
        "raw_record_count": int(len(raw_df)),
        "processed_row_count": int(len(wide_df)),
        "processed_column_count": int(len(wide_df.columns)),
        "unique_cities": int(wide_df["city"].nunique(dropna=True)),
        "unique_stations": int(wide_df["station"].nunique(dropna=True)),
        "timestamps": sorted(wide_df["last_update_iso"].dropna().unique().tolist()),
        "pollutant_columns": pollutant_cols,
        "avg_columns": avg_cols,
        "missing_values_by_column": missing_by_col,
        "total_missing_cells": int(wide_df.isna().sum().sum()),
        "negative_value_violations": negative_violations,
        "min_gt_max_violations": range_violations,
    }
    return report


def main():
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    raw_records = load_records(RAW_FILE)
    raw_df = normalize_records(raw_records)
    wide_df = build_station_snapshot(raw_df)
    report = validate_and_report(raw_df, wide_df)

    wide_df.to_csv(OUTPUT_FILE, index=False)
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\nSaved wide dataset     -> {OUTPUT_FILE}")
    print(f"Saved quality report   -> {REPORT_FILE}")
    print(f"Processed shape        : {wide_df.shape[0]} rows x {wide_df.shape[1]} columns")
    print(f"Pollutant columns ({len(report['pollutant_columns'])}): {report['pollutant_columns']}")
    print("\nMissing values (columns with > 0 missing):")
    for col, cnt in report["missing_values_by_column"].items():
        if cnt > 0:
            print(f"  {col:16s}: {cnt}")

    print("\nFirst 5 rows (metadata + *_avg columns):")
    preview_cols = ["city", "station", "last_update_iso", "valid_avg_count"] + report["avg_columns"]
    print(wide_df[preview_cols].head(5).to_string(index=False))


if __name__ == "__main__":
    main()