from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

# ==================================================
# AIRWATCH AI — EXPLORATORY DATA ANALYSIS (TASK 4)
# ==================================================
ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "processed" / "wb_station_snapshot.csv"
FIGURE_DIR = ROOT / "reports" / "figures"
SUMMARY_DIR = ROOT / "reports" / "eda"

FIGURE_DIR.mkdir(parents=True, exist_ok=True)
SUMMARY_DIR.mkdir(parents=True, exist_ok=True)

sns.set_theme(style="whitegrid")

# ==================================================
# LOAD & PREPARE DATA
# ==================================================
df = pd.read_csv(DATA_FILE)

POLLUTANTS = ["PM2.5", "PM10", "NO2", "SO2", "NH3", "OZONE", "CO"]
AVG_COLUMNS = [f"{p}_avg" for p in POLLUTANTS if f"{p}_avg" in df.columns]
UG_M3_AVG_COLS = [f"{p}_avg" for p in ["PM2.5", "PM10", "NO2", "SO2", "NH3", "OZONE"] if f"{p}_avg" in df.columns]

for col in AVG_COLUMNS:
    df[col] = pd.to_numeric(df[col], errors="coerce")

if "valid_avg_count" in df.columns:
    df["valid_avg_count"] = pd.to_numeric(df["valid_avg_count"], errors="coerce")

snapshot_ts = (
    str(df["last_update_iso"].dropna().iloc[0])
    if "last_update_iso" in df.columns and df["last_update_iso"].notna().any()
    else "Single Snapshot"
)

# ==================================================
# 1. POLLUTANT STATISTICS & DISTRIBUTIONS
# ==================================================
stats_rows = []
for p in POLLUTANTS:
    col = f"{p}_avg"
    if col not in df.columns:
        continue
    s = df[col].dropna()
    stats_rows.append({
        "pollutant": p,
        "column": col,
        "unit_note": "Check API metadata (often mg/m3 in CPCB vs ug/m3 in feed)" if p == "CO" else "ug/m3 (CPCB standard)",
        "n_valid": int(s.count()),
        "n_missing": int(df[col].isna().sum()),
        "missing_pct": round(float(df[col].isna().mean() * 100), 2),
        "mean": round(float(s.mean()), 2) if len(s) else np.nan,
        "std": round(float(s.std()), 2) if len(s) > 1 else np.nan,
        "min": round(float(s.min()), 2) if len(s) else np.nan,
        "q25": round(float(s.quantile(0.25)), 2) if len(s) else np.nan,
        "median": round(float(s.median()), 2) if len(s) else np.nan,
        "q75": round(float(s.quantile(0.75)), 2) if len(s) else np.nan,
        "max": round(float(s.max()), 2) if len(s) else np.nan,
    })

stats_df = pd.DataFrame(stats_rows)
stats_df.to_csv(SUMMARY_DIR / "pollutant_statistics.csv", index=False)

for p in POLLUTANTS:
    col = f"{p}_avg"
    if col not in df.columns:
        continue
    s = df[col].dropna()
    fig, ax = plt.subplots(figsize=(8, 4.5))
    sns.histplot(s, bins=8, kde=True, ax=ax, color="#2563eb")
    ax.set_title(f"{p} Average Distribution Across WB Stations ({snapshot_ts})")
    ax.set_xlabel(col)
    ax.set_ylabel("Station Count")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / f"{p}_distribution.png", dpi=150)
    plt.close(fig)

# Separate boxplot for ug/m3 pollutants vs CO (avoiding mixed-scale distortion)
if UG_M3_AVG_COLS:
    fig, ax = plt.subplots(figsize=(10, 5))
    melted_ug = df.melt(value_vars=UG_M3_AVG_COLS, var_name="pollutant_avg", value_name="value").dropna()
    sns.boxplot(data=melted_ug, x="pollutant_avg", y="value", ax=ax)
    sns.stripplot(data=melted_ug, x="pollutant_avg", y="value", color="#1e293b", alpha=0.65, size=4, ax=ax)
    ax.set_title(f"Pollutant Average Spread (ug/m3 Group, Excl. CO Scale) — {snapshot_ts}")
    ax.set_xlabel("Pollutant")
    ax.set_ylabel("Concentration (ug/m3)")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "pollutant_boxplots.png", dpi=150)
    plt.close(fig)

if "CO_avg" in df.columns and df["CO_avg"].notna().any():
    fig, ax = plt.subplots(figsize=(6, 4))
    sns.boxplot(y=df["CO_avg"].dropna(), ax=ax, color="#0d9488")
    sns.stripplot(y=df["CO_avg"].dropna(), color="#0f172a", alpha=0.75, size=5, ax=ax)
    ax.set_title(f"CO_avg Distribution (Separate Scale) — {snapshot_ts}")
    ax.set_ylabel("CO_avg (raw API scale)")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / "CO_boxplot.png", dpi=150)
    plt.close(fig)

# ==================================================
# 2. CITY COMPARISON
# ==================================================
for p in ["PM2.5", "PM10", "NO2"]:
    col = f"{p}_avg"
    if col not in df.columns:
        continue
    city_grp = (
        df.groupby("city", as_index=False)[col]
        .agg(
            stations="count",
            valid_stations=lambda s: int(s.notna().sum()),
            mean="mean",
            median="median",
            min="min",
            max="max",
        )
        .sort_values("mean", ascending=False, na_position="last")
    )
    for c in ["mean", "median", "min", "max"]:
        city_grp[c] = city_grp[c].round(2)
    city_grp.to_csv(SUMMARY_DIR / f"{p}_city_summary.csv", index=False)

    if p in ("PM2.5", "PM10"):
        plot_df = city_grp.sort_values("mean", ascending=True, na_position="first")
        fig, ax = plt.subplots(figsize=(8.5, 4.8))
        ax.barh(plot_df["city"], plot_df["mean"].fillna(0), color="#0284c7")
        ax.set_title(f"Mean {col} by City — West Bengal Snapshot ({snapshot_ts})")
        ax.set_xlabel(f"Mean {col}")
        ax.set_ylabel("City")
        plt.tight_layout()
        plt.savefig(FIGURE_DIR / f"{p}_city_comparison.png", dpi=150)
        plt.close(fig)

# ==================================================
# 3. STATION RANKINGS (HIGHEST & LOWEST)
# ==================================================
for p in ["PM2.5", "PM10"]:
    col = f"{p}_avg"
    if col not in df.columns:
        continue
    valid_st = df.dropna(subset=[col]).copy()
    valid_st["station_label"] = valid_st["station"] + " (" + valid_st["city"] + ")"

    top10 = valid_st.sort_values(col, ascending=False).head(10)
    bot10 = valid_st.sort_values(col, ascending=True).head(10)

    ranking_export = valid_st[["city", "station", "last_update_iso", col]].sort_values(col, ascending=False)
    ranking_export.to_csv(SUMMARY_DIR / f"{p}_station_ranking.csv", index=False)

    fig, axes = plt.subplots(1, 2, figsize=(14, 5.5))
    top_plot = top10.sort_values(col, ascending=True)
    axes[0].barh(top_plot["station_label"], top_plot[col], color="#dc2626")
    axes[0].set_title(f"Top 10 Highest {col}")
    axes[0].set_xlabel(col)

    bot_plot = bot10.sort_values(col, ascending=False)
    axes[1].barh(bot_plot["station_label"], bot_plot[col], color="#16a34a")
    axes[1].set_title(f"Top 10 Lowest {col}")
    axes[1].set_xlabel(col)

    plt.suptitle(f"{p} Station Extremes — {snapshot_ts}")
    plt.tight_layout()
    plt.savefig(FIGURE_DIR / f"{p}_station_extremes.png", dpi=150)
    plt.close(fig)

# ==================================================
# 4. POLLUTANT RELATIONSHIPS (CORRELATION)
# ==================================================
corr_df = df[AVG_COLUMNS].corr(method="pearson").round(3)
corr_df.to_csv(SUMMARY_DIR / "pollutant_correlation.csv")

fig, ax = plt.subplots(figsize=(8, 6.5))
sns.heatmap(corr_df, annot=True, fmt=".2f", cmap="coolwarm", vmin=-1, vmax=1, square=True, ax=ax)
ax.set_title(f"Pollutant Average Correlation Matrix (n={len(df)} stations, {snapshot_ts})")
plt.tight_layout()
plt.savefig(FIGURE_DIR / "pollutant_correlation_heatmap.png", dpi=150)
plt.close(fig)

# ==================================================
# 5. DATA RELIABILITY & MISSINGNESS
# ==================================================
missing_rows = []
for col in df.columns:
    n_miss = int(df[col].isna().sum())
    missing_rows.append({
        "column": col,
        "missing_count": n_miss,
        "missing_pct": round(float(n_miss / len(df) * 100), 2),
        "non_missing_count": int(len(df) - n_miss),
    })

missing_df = pd.DataFrame(missing_rows).sort_values("missing_count", ascending=False)
missing_df.to_csv(SUMMARY_DIR / "missing_values.csv", index=False)

# ==================================================
# CONSOLE SUMMARY
# ==================================================
print("=== AIRWATCH AI — EDA SUMMARY ===")
print(f"Snapshot Timestamp : {snapshot_ts}")
print(f"Stations Analyzed  : {len(df)} across {df['city'].nunique()} cities\n")

print("--- 1. Pollutant Averages ---")
print(stats_df[["pollutant", "n_valid", "n_missing", "mean", "median", "min", "max"]].to_string(index=False))

print("\n--- 2. PM2.5 City Ranking ---")
pm25_city_file = SUMMARY_DIR / "PM2.5_city_summary.csv"
if pm25_city_file.exists():
    print(pd.read_csv(pm25_city_file).to_string(index=False))

print("\n--- 3. Top 3 & Bottom 3 Stations by PM2.5_avg ---")
pm25_valid = df.dropna(subset=["PM2.5_avg"]).sort_values("PM2.5_avg", ascending=False)
print("Highest:")
print(pm25_valid[["city", "station", "PM2.5_avg", "PM10_avg"]].head(3).to_string(index=False))
print("Lowest:")
print(pm25_valid[["city", "station", "PM2.5_avg", "PM10_avg"]].tail(3).to_string(index=False))

print("\n--- 4. Top Pollutant Correlations (|r| >= 0.4, excluding diagonal) ---")
pairs = []
for i, c1 in enumerate(AVG_COLUMNS):
    for j, c2 in enumerate(AVG_COLUMNS):
        if i < j:
            val = corr_df.loc[c1, c2]
            if pd.notna(val) and abs(val) >= 0.4:
                pairs.append((abs(val), val, c1, c2))
for _, val, c1, c2 in sorted(pairs, reverse=True):
    print(f"  {c1:10s} <-> {c2:10s} : r = {val:.3f}")

print("\n--- 5. Missingness Summary (Columns with Missing Values) ---")
miss_nonzero = missing_df[missing_df["missing_count"] > 0]
if len(miss_nonzero):
    print(miss_nonzero.to_string(index=False))
else:
    print("  No missing columns.")

print(f"\nSaved figures to : {FIGURE_DIR}")
print(f"Saved summaries to: {SUMMARY_DIR}")