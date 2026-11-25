# AirSense — Air Pollution Detection using Ensemble Learning

A React + TypeScript/TanStack Start dashboard, Open-Meteo air-quality integration, OpenAQ v3 monitoring-station integration, and a separate FastAPI/scikit-learn inference service.

## What is included

- Dashboard, live station directory, manual AQI prediction, five-day forecast, West Bengal city view, health advisory and model-insights pages.
- Open-Meteo hourly pollutant concentrations and forecast for the indexed Indian cities.
- OpenAQ v3 location discovery around selected cities and latest available sensor readings (requires `OPENAQ_API_KEY`). Missing readings are never fabricated.
- Optional data.gov.in resource proxy (requires `DATA_GOV_IN_API_KEY` and a selected `DATA_GOV_IN_RESOURCE_ID`). Resource fields are returned as-is because each resource has its own schema; validate units and field semantics before using as model labels.
- Separate Python training and FastAPI inference service with Random Forest, Gradient Boosting and KNN weighted ensemble.
- No login or database required.

## Requirements

- Node.js 20+ and npm
- Python 3.10+ (3.11 recommended)
- Internet access for the public data APIs and historical training fetch

## Run the web application

```bash
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL printed in the terminal. Without a running Python service, AQI prediction uses a clearly disclosed TypeScript demonstration fallback.

## Train and run the real ML service

In another terminal:

```bash
cd python
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
python train.py
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Keep `AIRSENSE_ML_API_URL=http://127.0.0.1:8000` in the root `.env`, then restart the web server. The TypeScript server function forwards prediction requests to FastAPI. Verify the service at `http://127.0.0.1:8000/health` and inspect metrics at `/metrics`.

## API keys

- OpenAQ: create a free API key from OpenAQ and set `OPENAQ_API_KEY` in the root `.env`. Requests use the v3 API and `X-API-Key` header.
- data.gov.in: create a key and select the specific CPCB/air-quality resource you intend to use. Set both `DATA_GOV_IN_API_KEY` and `DATA_GOV_IN_RESOURCE_ID`. The resource proxy returns raw records; field mapping and validation remain resource-specific.
- Open-Meteo: no API key required for the public non-commercial endpoint. Review provider terms and attribution requirements before deployment.

## Data and scientific limitations

Open-Meteo provides modelled CAMS concentrations/forecasts, not direct station measurements. OpenAQ is a partial aggregation of public monitoring data and does not cover every station or pollutant. OpenAQ's latest values can be incomplete or out of order. CPCB-style AQI requires pollutant-specific averaging windows and valid sub-indices; this project applies rolling windows in the Python training pipeline, but the training target is still a **CPCB-breakpoint proxy derived from modelled concentrations**, not official CPCB AQI labels. Metrics therefore describe prediction of that proxy only. Do not describe it as validated CPCB station accuracy.

For research or operational deployment, ingest validated CPCB station observations, document station calibration/quality flags, align pollutant units and averaging windows, use station- and time-separated evaluation, monitor data freshness, and review official health guidance. The app is educational and is not an official alert system or medical advice.

## Build and checks

```bash
npm run typecheck
npm run build
```

The ZIP contains source code only; no API keys, trained model binaries or fabricated evaluation scores are included. Train locally to generate `python/artifacts/`.
