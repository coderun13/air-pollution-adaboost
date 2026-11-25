from pathlib import Path
import json
import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
BASE=Path(__file__).parent; ART=BASE/"artifacts"; MODEL_PATH=ART/"airsense_models.joblib"; METRICS_PATH=ART/"metrics.json"
app=FastAPI(title="AirSense AQI API",version="2.0.0",description="Trained Random Forest, Gradient Boosting and KNN weighted ensemble. Targets are model-derived CPCB-breakpoint proxies, not official CPCB observations.")
bundle=None
@app.on_event("startup")
def load_model():
    global bundle
    if MODEL_PATH.exists(): bundle=joblib.load(MODEL_PATH)
class Pollutants(BaseModel):
    pm2_5:Optional[float]=Field(None,ge=0,le=100000); pm10:Optional[float]=Field(None,ge=0,le=100000)
    nitrogen_dioxide:Optional[float]=Field(None,ge=0,le=100000); sulphur_dioxide:Optional[float]=Field(None,ge=0,le=100000)
    carbon_monoxide:Optional[float]=Field(None,ge=0,le=1000,description="mg/m3"); ozone:Optional[float]=Field(None,ge=0,le=100000); ammonia:Optional[float]=Field(None,ge=0,le=100000)
def category(v):
    return "Good" if v<=50 else "Satisfactory" if v<=100 else "Moderate" if v<=200 else "Poor" if v<=300 else "Very Poor" if v<=400 else "Severe"
@app.get("/health")
def health(): return {"ok":True,"model_loaded":bundle is not None}
@app.get("/metrics")
def metrics():
    if not METRICS_PATH.exists(): raise HTTPException(404,"Train the model first.")
    return json.loads(METRICS_PATH.read_text())
def predict_one(p:Pollutants):
    if bundle is None: raise HTTPException(503,"Model not trained. Run python train.py first.")
    vals=p.model_dump(); features=bundle["features"]
    row=np.array([[vals.get(k) for k in features]],dtype=float)
    if np.isnan(row).all(): raise HTTPException(422,"At least one pollutant value is required.")
    preds={k:float(m.predict(row)[0]) for k,m in bundle["models"].items()}; weights=bundle["weights"]
    aqi=int(np.clip(round(sum(preds[k]*weights[k] for k in preds)),0,500))
    return {"aqi":aqi,"category":category(aqi),"base_models":preds,"weights":weights,"model":"trained_scikit_learn_ensemble","target_note":"Trained on Open-Meteo CAMS-derived CPCB-breakpoint proxy targets, not measured CPCB station AQI."}

@app.post("/predict")
def predict(p:Pollutants):
    return predict_one(p)

@app.post("/predict/batch")
def predict_batch(items:list[Pollutants]):
    if len(items)>500: raise HTTPException(413,"Maximum 500 hourly records per request.")
    return [predict_one(item) for item in items]
