import json
from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import AdaBoostClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.tree import DecisionTreeClassifier

# --------------------------------------------------
# PATHS
# --------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent
DATA_CSV = PROJECT_ROOT / "data" / "processed" / "station_day_ml_dataset.csv"
MODEL_DIR = PROJECT_ROOT / "reports" / "models"
FIG_DIR = PROJECT_ROOT / "reports" / "figures"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
FIG_DIR.mkdir(parents=True, exist_ok=True)

FEATURES = ["PM2_5", "PM10", "NO2", "SO2", "CO", "O3", "NH3"]
TARGET = "aqi_category"
CLASS_ORDER = ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]


def chronological_split(df: pd.DataFrame, test_fraction: float = 0.2):
    """Time-ordered split by date so future observations do not leak into evaluation."""
    ordered = df.sort_values(["date_parsed", "Station"]).reset_index(drop=True)
    unique_dates = sorted(ordered["date_parsed"].dropna().unique())
    split_idx = int(len(unique_dates) * (1.0 - test_fraction))
    split_idx = max(1, min(split_idx, len(unique_dates) - 1))
    cutoff_date = unique_dates[split_idx]

    train_df = ordered[ordered["date_parsed"] < cutoff_date].copy()
    test_df = ordered[ordered["date_parsed"] >= cutoff_date].copy()
    return train_df, test_df, pd.Timestamp(cutoff_date).strftime("%Y-%m-%d")


def get_models(random_state: int = 42) -> dict:
    return {
        "DecisionTree_Baseline": DecisionTreeClassifier(
            max_depth=8,
            min_samples_leaf=10,
            random_state=random_state,
        ),
        "AdaBoost_Primary": AdaBoostClassifier(
            estimator=DecisionTreeClassifier(max_depth=3, random_state=random_state),
            n_estimators=100,
            learning_rate=0.5,
            random_state=random_state,
        ),
    }


def plot_confusion_matrix(cm: np.ndarray, labels: list[str], model_name: str, out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(7.5, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=labels,
        yticklabels=labels,
        ax=ax,
    )
    ax.set_title(f"Confusion Matrix — {model_name}")
    ax.set_xlabel("Predicted Class")
    ax.set_ylabel("True Class")
    plt.xticks(rotation=30, ha="right")
    plt.yticks(rotation=0)
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close(fig)


def plot_model_comparison(metrics_df: pd.DataFrame, out_path: Path) -> None:
    melted = metrics_df.melt(
        id_vars="model",
        value_vars=["accuracy", "macro_f1", "weighted_f1"],
        var_name="metric",
        value_name="score",
    )
    fig, ax = plt.subplots(figsize=(8, 4.8))
    sns.barplot(data=melted, x="model", y="score", hue="metric", ax=ax)
    ax.set_ylim(0, 1.05)
    ax.set_title("AdaBoost vs. Decision Tree Baseline (Chronological Split)")
    ax.set_xlabel("Model")
    ax.set_ylabel("Score")
    plt.xticks(rotation=15, ha="right")
    plt.tight_layout()
    plt.savefig(out_path, dpi=150)
    plt.close(fig)


def main() -> None:
    if not DATA_CSV.exists():
        raise FileNotFoundError(f"Missing {DATA_CSV}. Run build_training_dataset.py first.")

    df = pd.read_csv(DATA_CSV)
    df["date_parsed"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=FEATURES + [TARGET, "date_parsed"]).copy()

    train_df, test_df, cutoff_str = chronological_split(df, test_fraction=0.2)
    X_train, y_train = train_df[FEATURES], train_df[TARGET]
    X_test, y_test = test_df[FEATURES], test_df[TARGET]

    test_labels = [c for c in CLASS_ORDER if c in set(y_test.unique())]

    print("=== AIRWATCH AI — ADABOOST VS. DECISION TREE BASELINE ===")
    print(f"Total rows      : {len(df):,}")
    print(f"Cutoff date     : {cutoff_str}")
    print(f"Train rows      : {len(train_df):,} ({train_df['date_parsed'].min().date()} -> {train_df['date_parsed'].max().date()})")
    print(f"Test rows       : {len(test_df):,} ({test_df['date_parsed'].min().date()} -> {test_df['date_parsed'].max().date()})")
    print(f"Classes in test : {test_labels}\n")

    models = get_models(random_state=42)
    summary_rows = []
    detailed_reports = {}

    for name, clf in models.items():
        clf.fit(X_train, y_train)
        preds = clf.predict(X_test)

        acc = float(accuracy_score(y_test, preds))
        prec_macro = float(precision_score(y_test, preds, average="macro", zero_division=0))
        rec_macro = float(recall_score(y_test, preds, average="macro", zero_division=0))
        macro_f1 = float(f1_score(y_test, preds, average="macro", zero_division=0))
        weighted_f1 = float(f1_score(y_test, preds, average="weighted", zero_division=0))

        cm = confusion_matrix(y_test, preds, labels=test_labels)
        report_dict = classification_report(y_test, preds, labels=test_labels, output_dict=True, zero_division=0)

        summary_rows.append({
            "model": name,
            "accuracy": round(acc, 4),
            "precision_macro": round(prec_macro, 4),
            "recall_macro": round(rec_macro, 4),
            "macro_f1": round(macro_f1, 4),
            "weighted_f1": round(weighted_f1, 4),
        })
        detailed_reports[name] = {
            "metrics": summary_rows[-1],
            "confusion_matrix_labels": test_labels,
            "confusion_matrix": cm.tolist(),
            "classification_report": report_dict,
        }

        plot_confusion_matrix(
            cm,
            test_labels,
            name,
            FIG_DIR / f"cm_{name.lower()}.png",
        )

    metrics_df = pd.DataFrame(summary_rows).sort_values("macro_f1", ascending=False).reset_index(drop=True)
    metrics_df.to_csv(MODEL_DIR / "model_comparison_metrics.csv", index=False)

    with open(MODEL_DIR / "model_evaluation_details.json", "w", encoding="utf-8") as f:
        json.dump(detailed_reports, f, indent=2)

    plot_model_comparison(metrics_df, FIG_DIR / "model_comparison_metrics.png")

    print("=== 2-MODEL COMPARISON (SORTED BY MACRO-F1) ===")
    print(metrics_df.to_string(index=False))


if __name__ == "__main__":
    main()