import json
from pathlib import Path
import joblib
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "adaboost_aqi_classifier.joblib"
EVAL_JSON = ROOT / "reports" / "models" / "model_evaluation_details.json"
OUT_DIR = ROOT / "reports" / "models"
FIG_DIR = ROOT / "reports" / "figures"

OUT_DIR.mkdir(parents=True, exist_ok=True)
FIG_DIR.mkdir(parents=True, exist_ok=True)

bundle = joblib.load(MODEL_PATH)
model = bundle["model"] if isinstance(bundle, dict) else bundle
features = bundle["features"] if isinstance(bundle, dict) and "features" in bundle else [
    "PM2_5", "PM10", "NO2", "SO2", "CO", "O3", "NH3"
]

# 1. Feature Importances
fi_df = (
    pd.DataFrame({
        "feature": features,
        "importance": model.feature_importances_,
    })
    .sort_values("importance", ascending=False)
    .reset_index(drop=True)
)
fi_df["importance_pct"] = (fi_df["importance"] * 100).round(2)
fi_df.to_csv(OUT_DIR / "adaboost_feature_importances.csv", index=False)

print("=== ADABOOST FEATURE IMPORTANCES ===")
print(fi_df.to_string(index=False))

fig, ax = plt.subplots(figsize=(8, 4.5))
sns.barplot(data=fi_df, x="importance", y="feature", ax=ax, color="#2563eb")
ax.set_title("AdaBoost Classifier Feature Importances")
ax.set_xlabel("Importance")
ax.set_ylabel("Pollutant Feature")
plt.tight_layout()
plt.savefig(FIG_DIR / "adaboost_feature_importances.png", dpi=150)
plt.close(fig)

# 2. Error Summary from model_evaluation_details.json
if EVAL_JSON.exists():
    with open(EVAL_JSON, "r", encoding="utf-8") as f:
        details = json.dump if False else json.load(f)
    ada_info = details.get("AdaBoost_Primary", {})
    labels = ada_info.get("confusion_matrix_labels", [])
    cm = ada_info.get("confusion_matrix", [])
    print("\n=== ADABOOST CONFUSION MATRIX ===")
    if labels and cm:
        cm_df = pd.DataFrame(cm, index=labels, columns=labels)
        print(cm_df.to_string())
        off_diag = []
        for i, r_lbl in enumerate(labels):
            for j, c_lbl in enumerate(labels):
                if i != j and cm[i][j] > 0:
                    off_diag.append((cm[i][j], r_lbl, c_lbl))
        print("\nMisclassifications (true -> predicted):")
        if off_diag:
            for cnt, t_lbl, p_lbl in sorted(off_diag, reverse=True):
                print(f"  {t_lbl:14s} -> {p_lbl:14s} : {cnt}")
        else:
            print("  0 off-diagonal misclassifications on test split.")