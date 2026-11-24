from pathlib import Path
import pandas as pd

# --------------------------------------------------
# PATHS
# --------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent
EXT_DIR = PROJECT_ROOT / "data" / "external" / "kaggle_india_aqi"

FILES = [
    "stations.csv",
    "station_day.csv",
    "station_hour.csv",
    "city_day.csv",
    "city_hour.csv",
]

WB_CITIES = {
    "kolkata",
    "howrah",
    "asansol",
    "durgapur",
    "barrackpore",
    "haldia",
    "siliguri",
}

DATE_CANDIDATES = ["Date", "Datetime", "date", "datetime", "last_update"]


def find_date_col(df: pd.DataFrame) -> str | None:
    for col in DATE_CANDIDATES:
        if col in df.columns:
            return col
    return None


def inspect_csv(filename: str) -> None:
    filepath = EXT_DIR / filename
    print("=" * 70)
    print(f"FILE: {filename}")
    if not filepath.exists():
        print(f"  [Missing] File not found at {filepath}")
        return

    size_mb = filepath.stat().st_size / (1024 * 1024)
    print(f"  Size: {size_mb:.2f} MB")

    # Read sample/full table (low_memory=False avoids mixed-type warnings on large CSVs)
    df = pd.read_csv(filepath, low_memory=False)
    print(f"  Shape: {df.shape[0]:,} rows x {df.shape[1]} columns")
    print(f"  Columns: {list(df.columns)}")

    # Date / timestamp range
    date_col = find_date_col(df)
    if date_col:
        parsed_dates = pd.to_datetime(df[date_col], errors="coerce")
        valid_dates = parsed_dates.dropna()
        invalid_count = int(parsed_dates.isna().sum())
        if len(valid_dates) > 0:
            print(f"  Date column '{date_col}': {valid_dates.min()} -> {valid_dates.max()} (unparsed: {invalid_count:,})")
        else:
            print(f"  Date column '{date_col}': could not parse dates (unparsed: {invalid_count:,})")

    # City / Station coverage & West Bengal check
    for loc_col in ["City", "city", "StationId", "station_id", "StationName", "station"]:
        if loc_col in df.columns:
            unique_vals = df[loc_col].dropna().astype(str).str.strip()
            print(f"  Unique '{loc_col}': {unique_vals.nunique():,}")
            if loc_col.lower() == "city":
                wb_matches = sorted({v for v in unique_vals.unique() if v.lower() in WB_CITIES})
                print(f"  West Bengal cities matched: {wb_matches if wb_matches else 'None'}")

    # Missing values per column
    miss_pct = (df.isna().mean() * 100).round(2)
    miss_summary = pd.DataFrame({
        "missing_rows": df.isna().sum(),
        "missing_pct": miss_pct,
    })
    nonzero_miss = miss_summary[miss_summary["missing_rows"] > 0].sort_values("missing_pct", ascending=False)
    if len(nonzero_miss) > 0:
        print("  Missing values (top columns):")
        print(nonzero_miss.head(12).to_string())
    else:
        print("  Missing values: 0 across all columns")

    print("  First 3 rows:")
    print(df.head(3).to_string(index=False))


def main() -> None:
    if not EXT_DIR.exists():
        print(f"Extraction folder not found: {EXT_DIR}")
        print("Extract the archive CSVs there first, then re-run.")
        return

    for fname in FILES:
        inspect_csv(fname)


if __name__ == "__main__":
    main()