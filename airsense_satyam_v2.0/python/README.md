# AirSense Python ML service

This service trains and serves a three-model AQI regression ensemble: Random Forest, Gradient Boosting and distance-weighted KNN.

## Quick start

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
python train.py
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs`; check `/health`, `/metrics`, and `POST /predict`.

## Training data and target semantics

`train.py` requests hourly historical air-quality concentrations from Open-Meteo for the city list in the script. It computes rolling averages (24 hours for PM2.5, PM10, NO2, SO2 and NH3; 8 hours for CO and O3), converts CO from µg/m³ to mg/m³, then calculates CPCB-breakpoint sub-indices and uses the maximum valid sub-index as a **proxy AQI target**. At least three valid sub-indices including PM2.5 or PM10 are required.

**Important research limitation:** Open-Meteo concentrations are CAMS modelled estimates, not CPCB reference-station measurements. Therefore the resulting labels are CPCB-breakpoint-derived proxy labels, not ground-truth CPCB AQI. The held-out R²/RMSE/MAE measure fit to this proxy target only. For a defensible research-grade CPCB model, replace/augment the source with validated CPCB/data.gov.in station observations, harmonize averaging windows and units, and evaluate by station and future time periods.

The dataset is split chronologically 70/15/15. Validation RMSE determines inverse-error ensemble weights; final test metrics are computed on the untouched last 15%. Artifacts are written to `python/artifacts/`:

- `airsense_models.joblib` — fitted pipelines and classifier
- `metrics.json` — split periods, validation weights, held-out metrics and feature importance

`main.py` loads the fitted artifact on startup. Run training before starting the API. Do not load untrusted joblib files.

## API input units

`POST /predict` accepts JSON fields `pm2_5`, `pm10`, `nitrogen_dioxide`, `sulphur_dioxide`, `ozone`, `ammonia` in µg/m³ and `carbon_monoxide` in mg/m³. Missing features are median-imputed by each fitted pipeline. At least one pollutant is required.
