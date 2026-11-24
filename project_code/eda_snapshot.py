import json
from pathlib import Path
import matplotlib.pyplot as plt
import pandas as pd

# --------------------------------------------------
# PATHS
# --------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent
INPUT_CSV = PROJECT_ROOT / "data" / "processed" / "wb_station_snapshot.csv"
REPORT_JSON = PROJECT_ROOT / "data" / "processed" / "wb_data_quality_report.json"
FIGURES_DIR = PROJECT_ROOT / "reports" / "figures"
SUMMARY_JSON = PROJECT_ROOT / "data" / "processed" / "wb_eda_summary.json"

AVG_COLS = [
    "PM2.5_avg",
    "PM10_avg",
    "NO2_avg",
    "SO2_avg",
    "NH3_avg",
    "OZONE_avg",
    "CO_avg",
]


def load_snapshot(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise FileNotFoundError(f"Processed CSV not found: {csv_path}. Run process_data.py first.")
    df = pd.read_csv(csv_path)
    for col in AVG_COLS:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def summarize_pollutants(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for col in AVG_COLS:
        s = df[col].dropna()
        rows.append({
            "pollutant_avg": col,
            "valid_stations": int(s.count()),
            "missing_stations": int(df[col].isna().sum()),
            "mean": round(float(s.mean()), 2) if len(s) else None,
            "median": round(float(s.median()), 2) if len(s) else None,
            "min": round(float(s.min()), 2) if len(s) else None,
            "max": round(float(s.max()), 2) if len(s) else None,
        })
    return pd.DataFrame(rows)


def summarize_cities(df: pd.DataFrame) -> pd.DataFrame:
    city_summary = (
        df.groupby("city", as_index=False)
        .agg(
            stations=("station", "count"),
            avg_valid_pollutants=("valid_avg_count", "mean"),
            pm25_mean=("PM2.5_avg", "mean"),
            pm10_mean=("PM10_avg", "mean"),
            no2_mean=("NO2_avg", "mean"),
            so2_mean=("SO2_avg", "mean"),
            ozone_mean=("OZONE_avg", "mean"),
            co_mean=("CO_avg", "mean"),
        )
        .sort_values("pm25_mean", ascending=False, na_position="last")
        .reset_index(drop=True)
    )
    for col in city_summary.columns:
        if city_summary[col].dtype in ("float64", "float32"):
            city_summary[col] = city_summary[col].round(2)
    return city_summary


def inspect_incomplete_stations(df: pd.DataFrame) -> list[dict]:
    incomplete = df[df["valid_avg_count"] < 7]
    details = []
    for _, row in incomplete.iterrows():
        missing_pollutants = [
            col.replace("_avg", "") for col in AVG_COLS if pd.isna(row[col])
        ]
        details.append({
            "city": row["city"],
            "station": row["station"],
            "valid_avg_count": int(row["valid_avg_count"]),
            "missing_pollutants": missing_pollutants,
            "pm25_avg": None if pd.isna(row["PM2.5_avg"]) else float(row["PM2.5_avg"]),
            "pm10_avg": None if pd.isna(row["PM10_avg"]) else float(row["PM10_avg"]),
        })
    return details


def plot_charts(df: pd.DataFrame, city_df: pd.DataFrame, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    ts_label = str(df["last_update_iso"].dropna().iloc[0]) if "last_update_iso" in df.columns and len(df) else "Snapshot"

    # Chart 1: Station ranking by PM2.5_avg
    st_sorted = df.sort_values("PM2.5_avg", ascending=True, na_position="first")
    fig, ax = plt.subplots(figsize=(10, 7))
    colors = ["#94a3b8" if pd.isna(v) else "#2563eb" for v in st_sorted["PM2.5_avg"]]
    vals = [0 if pd.isna(v) else v for v in st_sorted["PM2.5_avg"]]
    labels = [f"{r['station']} ({r['city']})" for _, r in st_sorted.iterrows()]

    ax.barh(labels, vals, color=colors)
    ax.set_xlabel("PM2.5 Average Concentration")
    ax.set_title(f"West Bengal Monitoring Stations by PM2.5_avg ({ts_label})")
    ax.grid(axis="x", linestyle="--", alpha=0.4)
    plt.tight_layout()
    plt.savefig(out_dir / "wb_station_pm25_ranking.png", dpi=150)
    plt.close(fig)

    # Chart 2: City-level mean comparison for PM2.5 and PM10
    city_plot = city_df.sort_values("pm25_mean", ascending=True, na_position="first")
    y = range(len(city_plot))
    height = 0.38

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.barh([i + height / 2 for i in y], city_plot["pm25_mean"].fillna(0), height=height, label="PM2.5_avg (city mean)")
    ax.barh([i - height / 2 for i in y], city_plot["pm10_mean"].fillna(0), height=height, label="PM10_avg (city mean)")
    ax.set_yticks(list(y))
    ax.set_yticklabels(city_plot["city"])
    ax.set_xlabel("Mean Concentration")
    ax.set_title(f"City Mean PM2.5 vs PM10 — West Bengal ({ts_label})")
    ax.legend()
    ax.grid(axis="x", linestyle="--", alpha=0.4)
    plt.tight_layout()
    plt.savefig(out_dir / "wb_city_pm_comparison.png", dpi=150)
    plt.close(fig)


def main():
    df = load_snapshot(INPUT_CSV)
    pollutant_df = summarize_pollutants(df)
    city_df = summarize_cities(df)
    incomplete_stations = inspect_incomplete_stations(df)
    plot_charts(df, city_df, FIGURES_DIR)

    print("=== POLLUTANT DISTRIBUTION (22 STATIONS) ===")
    print(pollutant_df.to_string(index=False))

    print("\n=== CITY SUMMARY (SORTED BY PM2.5 MEAN) ===")
    print(city_df.to_string(index=False))

    print("\n=== STATIONS WITH MISSING POLLUTANT AVERAGES (< 7) ===")
    if incomplete_stations:
        for item in incomplete_stations:
            print(f"  - {item['station']} ({item['city']}): valid={item['valid_avg_count']}/7 | missing={item['missing_pollutants']}")
    else:
        print("  None — all stations have all 7 pollutant averages.")

    top_pm25 = df.dropna(subset=["PM2.5_avg"]).sort_values("PM2.5_avg", ascending=False).head(5)
    print("\n=== TOP 5 STATIONS BY PM2.5_avg ===")
    print(top_pm25[["city", "station", "PM2.5_avg", "PM10_avg", "NO2_avg"]].to_string(index=False))

    summary_payload = {
        "pollutant_summary": pollutant_df.to_dict(orient="records"),
        "city_summary": city_df.to_dict(orient="records"),
        "incomplete_stations": incomplete_stations,
        "charts_saved": [
            str(FIGURES_DIR / "wb_station_pm25_ranking.png"),
            str(FIGURES_DIR / "wb_city_pm_comparison.png"),
        ],
    }
    with open(SUMMARY_JSON, "w", encoding="utf-8") as f:
        json.dump(summary_payload, f, indent=2)
    print(f"\nSaved EDA summary -> {SUMMARY_JSON}")
    print(f"Saved charts      -> {FIGURES_DIR}")


if __name__ == "__main__":
    main()