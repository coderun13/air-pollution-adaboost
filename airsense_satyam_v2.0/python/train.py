"""Train an hourly AirSense RF/GB/KNN ensemble on Open-Meteo historical AQ data.

Important: targets are CPCB-breakpoint-derived proxy AQI labels from CAMS
modelled concentrations, NOT ground-truth CPCB station AQI observations.
"""
from __future__ import annotations
import json, os, time
from pathlib import Path
import requests
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsRegressor
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_error, accuracy_score
import joblib

BASE=Path(__file__).parent
OUT=BASE/"artifacts"; OUT.mkdir(exist_ok=True)
FEATURES=["pm2_5","pm10","nitrogen_dioxide","sulphur_dioxide","carbon_monoxide","ozone","ammonia"]
CITIES={"Kolkata":(22.5726,88.3639),"Howrah":(22.5958,88.2636),"Durgapur":(23.5204,87.3119),"Asansol":(23.6739,86.9524),"Siliguri":(26.7271,88.3953),"Haldia":(22.0667,88.0698),"Deoghar":(24.4854,86.6947),"Delhi":(28.6139,77.2090),"Mumbai":(19.0760,72.8777),"Bengaluru":(12.9716,77.5946),"Chennai":(13.0827,80.2707),"Hyderabad":(17.3850,78.4867)}
# (low, high, AQI-low, AQI-high); concentrations in µg/m³ except CO mg/m³.
BP={"pm2_5":[(0,30,0,50),(30,60,50,100),(60,90,100,200),(90,120,200,300),(120,250,300,400),(250,500,400,500)],"pm10":[(0,50,0,50),(50,100,50,100),(100,250,100,200),(250,350,200,300),(350,430,300,400),(430,600,400,500)],"nitrogen_dioxide":[(0,40,0,50),(40,80,50,100),(80,180,100,200),(180,280,200,300),(280,400,300,400),(400,1000,400,500)],"sulphur_dioxide":[(0,40,0,50),(40,80,50,100),(80,380,100,200),(380,800,200,300),(800,1600,300,400),(1600,2000,400,500)],"carbon_monoxide":[(0,1,0,50),(1,2,50,100),(2,10,100,200),(10,17,200,300),(17,34,300,400),(34,50,400,500)],"ozone":[(0,50,0,50),(50,100,50,100),(100,168,100,200),(168,208,200,300),(208,748,300,400),(748,1000,400,500)],"ammonia":[(0,200,0,50),(200,400,50,100),(400,800,100,200),(800,1200,200,300),(1200,1800,300,400),(1800,2400,400,500)]}
def sub_index(name,value):
    if pd.isna(value): return np.nan
    for lo,hi,ilo,ihi in BP[name]:
        if lo<=value<=hi: return (ihi-ilo)*(value-lo)/(hi-lo)+ilo
    return 500.0 if value>0 else 0.0

def fetch_city(name,coords,start,end):
    lat,lon=coords; url="https://air-quality-api.open-meteo.com/v1/air-quality"
    params={"latitude":lat,"longitude":lon,"hourly":",".join(FEATURES),"start_date":start,"end_date":end,"timezone":"Asia/Kolkata"}
    r=requests.get(url,params=params,timeout=120); r.raise_for_status()
    data=r.json(); h=data.get("hourly",{})
    if not h.get("time"): raise RuntimeError(f"No hourly data for {name}: {data}")
    df=pd.DataFrame(h); df["city"]=name; df["time"]=pd.to_datetime(df["time"])
    return df

def build_targets(df):
    # CPCB uses averaging windows: 24h for PM and most gases; 8h for CO/O3.
    df=df.sort_values(["city","time"]).copy()
    df["carbon_monoxide"]=df["carbon_monoxide"]/1000.0 # Open-Meteo µg/m³ -> mg/m³
    for col in ["pm2_5","pm10","nitrogen_dioxide","sulphur_dioxide","ammonia"]:
        df[f"avg_{col}"]=df.groupby("city")[col].transform(lambda s:s.rolling(24,min_periods=18).mean())
    for col in ["carbon_monoxide","ozone"]:
        df[f"avg_{col}"]=df.groupby("city")[col].transform(lambda s:s.rolling(8,min_periods=6).mean())
    subs=pd.DataFrame({k:df[f"avg_{k}"].map(lambda x:sub_index(k,x)) for k in FEATURES})
    # Operational minimum: at least 3 valid sub-indices including one particulate.
    count=subs.notna().sum(axis=1)
    particulate=subs[["pm2_5","pm10"]].notna().any(axis=1)
    df["aqi"]=subs.max(axis=1); df.loc[(count<3)|(~particulate),"aqi"]=np.nan
    return df

def main():
    start=os.getenv("START_DATE","2022-01-01"); end=os.getenv("END_DATE","2025-12-31")
    frames=[]
    for name,coords in CITIES.items():
        try:
            print(f"Fetching {name}: {start} to {end}")
            frames.append(fetch_city(name,coords,start,end)); time.sleep(.3)
        except Exception as exc: print(f"WARNING {name}: {exc}")
    if not frames: raise SystemExit("No data fetched. Check network and Open-Meteo date coverage.")
    df=build_targets(pd.concat(frames,ignore_index=True)).dropna(subset=["aqi"]).sort_values("time").reset_index(drop=True)
    if len(df)<1000: raise SystemExit(f"Only {len(df)} valid rows; at least 1000 required.")
    X=df[FEATURES].replace([np.inf,-np.inf],np.nan); y=df.aqi.clip(0,500)
    n=len(df); a=int(n*.70); b=int(n*.85)
    Xtr,ytr=X.iloc[:a],y.iloc[:a]; Xv,yv=X.iloc[a:b],y.iloc[a:b]; Xte,yte=X.iloc[b:],y.iloc[b:]
    models={"random_forest":make_pipeline(SimpleImputer(strategy="median"),RandomForestRegressor(n_estimators=300,min_samples_leaf=2,max_features=.9,random_state=42,n_jobs=-1)),"gradient_boosting":make_pipeline(SimpleImputer(strategy="median"),GradientBoostingRegressor(n_estimators=220,learning_rate=.04,max_depth=2,loss="huber",random_state=42)),"knn":make_pipeline(SimpleImputer(strategy="median"),StandardScaler(),KNeighborsRegressor(n_neighbors=15,weights="distance"))}
    vp={}
    for k,m in models.items(): m.fit(Xtr,ytr); vp[k]=m.predict(Xv)
    vrmse={k:float(mean_squared_error(yv,p)**.5) for k,p in vp.items()}
    inv={k:1/max(v,1e-6) for k,v in vrmse.items()}; total=sum(inv.values()); weights={k:v/total for k,v in inv.items()}
    tp={k:m.predict(Xte) for k,m in models.items()}; ens=sum(weights[k]*tp[k] for k in models)
    metrics={k:{"r2":float(r2_score(yte,p)),"rmse":float(mean_squared_error(yte,p)**.5),"mae":float(mean_absolute_error(yte,p))} for k,p in {**tp,"weighted_ensemble":ens}.items()}
    # Classifier is fitted only on training period and scored on held-out test period.
    bins=[-1,50,100,200,300,400,500]; cats=pd.cut(y,bins=bins,labels=False,include_lowest=True).astype(int)
    clf=RandomForestClassifier(n_estimators=250,min_samples_leaf=2,class_weight="balanced",random_state=42,n_jobs=-1)
    clf.fit(Xtr,cats.iloc[:a]); cat_acc=float(accuracy_score(cats.iloc[b:],clf.predict(Xte)))
    # Refit regression models on train + validation after selecting weights.
    Xfit=pd.concat([Xtr,Xv]); yfit=pd.concat([ytr,yv])
    for m in models.values(): m.fit(Xfit,yfit)
    importances=models["random_forest"].named_steps["randomforestregressor"].feature_importances_
    joblib.dump({"models":models,"classifier":clf,"features":FEATURES,"weights":weights},OUT/"airsense_models.joblib")
    artifact={"features":FEATURES,"weights":weights,"validation_rmse":vrmse,"test_metrics":metrics,"category_accuracy":cat_acc,"rows":int(len(df)),"cities":sorted(df.city.unique().tolist()),"train_period":[str(df.time.iloc[0]),str(df.time.iloc[a-1])],"test_period":[str(df.time.iloc[b]),str(df.time.iloc[-1])],"feature_importance":{k:float(v) for k,v in zip(FEATURES,importances)},"target":"CPCB-breakpoint proxy AQI derived from rolling Open-Meteo CAMS concentrations; not measured CPCB labels","split":"chronological 70/15/15"}
    (OUT/"metrics.json").write_text(json.dumps(artifact,indent=2)); print(json.dumps(artifact,indent=2))
if __name__=="__main__": main()
