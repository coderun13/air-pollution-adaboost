import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Wind, MapPin, Search, LayoutDashboard, RadioTower, Gauge, CloudSun, Map, HeartPulse, BrainCircuit, Menu, RefreshCw, ArrowUpRight, Leaf, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import { searchCity, predictAqi, getForecast, getStations, getModelMetrics } from "../server/airsense.functions";
import type { Pollutants, ModelResult, Station } from "../types";

export const Route = createFileRoute("/")({ component: AirSenseApp });

const DEFAULT_CITY = "Kolkata";
const empty: Pollutants = { pm25:45, pm10:82, no2:28, so2:8, co:0.7, o3:34, nh3:12 };
const nav = [
  ["Dashboard",LayoutDashboard],["Live Stations",RadioTower],["Predict AQI",Gauge],
  ["Forecast",CloudSun],["West Bengal",Map],["Health Advisory",HeartPulse],["Model Insights",BrainCircuit]
] as const;

function AirSenseApp() {
  const [page,setPage] = useState("Dashboard");
  const [city,setCity] = useState(DEFAULT_CITY);
  const [query,setQuery] = useState(DEFAULT_CITY);
  const [pollutants,setPollutants] = useState<Pollutants>(empty);
  const [result,setResult] = useState<ModelResult|null>(null);
  const [live,setLive] = useState<any>(null);
  const [forecast,setForecast] = useState<any[]>([]);
  const [stations,setStations] = useState<Station[]>([]);
  const [stationMessage,setStationMessage] = useState("Connect OpenAQ to load monitoring stations.");
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [filter,setFilter] = useState("All");

  async function loadCity(name:string) {
    setLoading(true); setError("");
    try {
      const data = await searchCity({data:{city:name}});
      setCity(data.city.name); setQuery(data.city.name); setLive(data);
      setPollutants(data.pollutants);
      const prediction = await predictAqi({data:data.pollutants});
      setResult(prediction);
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to load air quality."); }
    finally { setLoading(false); }
  }
  async function loadForecast(name=city) {
    try { const d=await getForecast({data:{city:name}}); setForecast(d.points.filter((_:any,i:number)=>i%6===0)); }
    catch(e) { setError(e instanceof Error ? e.message : "Forecast unavailable."); }
  }
  async function loadStations(name?:string,state?:string) {
    try { const d=await getStations({data:{city:name,state}}); setStations(d.stations); setStationMessage(d.message); }
    catch(e) { setStationMessage("Station service unavailable."); }
  }
  useEffect(()=>{ void loadCity(DEFAULT_CITY); void loadStations(); },[]);
  useEffect(()=>{ if(page==="Forecast") void loadForecast(); if(page==="Live Stations"||page==="West Bengal") void loadStations(undefined,page==="West Bengal"?"West Bengal":undefined); },[page]);

  const chartData = useMemo(()=>forecast.slice(0,25).map((x:any)=>({time:x.time?.slice(5,16),aqi:x.aqi,pm25:x.pm25})),[forecast]);
  const filteredStations = stations.filter(s => filter==="All" || s.state.toLowerCase().includes(filter.toLowerCase()) || s.city.toLowerCase().includes(filter.toLowerCase()));
  async function submitPrediction() {
    setLoading(true); setError("");
    try { setResult(await predictAqi({data:pollutants})); }
    catch(e) { setError(e instanceof Error?e.message:"Prediction failed."); }
    finally { setLoading(false); }
  }
  const aqi=result?.aqi ?? 0;
  const categoryColor=result?.color ?? "#9acb3c";

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Wind size={23}/></div><div><b>AirSense</b><small>ENVIRONMENTAL INTELLIGENCE</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={`nav-item ${page===label?"active":""}`} onClick={()=>setPage(label)}><Icon size={18}/><span>{label}</span>{label==="West Bengal"&&<span className="nav-tag">WB</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="source-status"><span className="pulse-dot"/><div><b>Open-Meteo</b><small>Data source available</small></div></div><div className="sidebar-foot">AIR QUALITY • INDIA<br/>Academic project prototype</div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="mobile-brand"><Wind size={21}/> AirSense</div><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div><div className="top-actions"><span className="live-pill"><i/> CURRENT FEED</span><button className="icon-btn" title="Refresh" onClick={()=>loadCity(city)}><RefreshCw size={17}/></button><div className="avatar">AS</div></div></header>
      <div className="content">
        {error&&<div className="error-banner"><AlertTriangle size={17}/>{error}<button onClick={()=>setError("")}>Dismiss</button></div>}
        {page==="Dashboard"&&<Dashboard city={city} query={query} setQuery={setQuery} loadCity={loadCity} loading={loading} live={live} result={result} chartData={chartData} setPage={setPage}/>}
        {page==="Live Stations"&&<Stations stations={filteredStations} message={stationMessage} filter={filter} setFilter={setFilter} loadStations={loadStations}/>}
        {page==="Predict AQI"&&<Predict pollutants={pollutants} setPollutants={setPollutants} result={result} submit={submitPrediction} loading={loading}/>}
        {page==="Forecast"&&<Forecast city={city} data={chartData} load={loadForecast}/>}
        {page==="West Bengal"&&<WestBengal stations={stations} message={stationMessage} setCity={setCity} loadCity={loadCity} setPage={setPage}/>}
        {page==="Health Advisory"&&<Health result={result}/>}
        {page==="Model Insights"&&<Insights result={result}/>}
        <footer className="footer">AirSense · Ensemble learning for cleaner-air decisions <span>Data may be modelled or delayed. Not an official CPCB alert system.</span></footer>
      </div>
    </main>
  </div>;
}

function PageTitle({eyebrow,title,desc,action}:{eyebrow:string;title:string;desc:string;action?:any}) {
 return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div>{action}</div>;
}
function Dashboard({city,query,setQuery,loadCity,loading,live,result,chartData,setPage}:any) {
 const color=result?.color??"#9acb3c";
 return <><PageTitle eyebrow="AIR QUALITY OVERVIEW" title="Breathe easier with better insight." desc="Monitor ambient air quality, understand pollutant patterns, and explore ensemble-powered AQI predictions." action={<button className="btn btn-secondary" onClick={()=>setPage("Predict AQI")}><Gauge size={16}/> Predict AQI</button>}/>
 <div className="search-row"><div className="searchbox"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&loadCity(query)} placeholder="Search an Indian city..."/></div><button className="btn btn-primary" onClick={()=>loadCity(query)} disabled={loading}>{loading?"Loading…":"Search location"} <ArrowUpRight size={16}/></button><span className="location-note"><MapPin size={14}/>{city}, India</span></div>
 <div className="hero-grid">
  <div className="aqi-card"><div className="card-top"><span>LIVE AIR QUALITY INDEX</span><span className="live-pill"><i/> CURRENT</span></div><div className="aqi-main"><div><div className="aqi-number" style={{color}}>{result?.aqi??"—"}</div><div className="aqi-category" style={{color}}>{result?.category??"Loading data"}</div></div><div className="aqi-gauge" style={{"--gauge":color} as any}><Wind size={35}/><small>INDIA AQI</small></div></div><div className="aqi-scale"><div className="scale-bar"/><div className="scale-labels"><span>Good</span><span>Satisfactory</span><span>Moderate</span><span>Poor</span><span>Very poor</span><span>Severe</span></div></div><div className="aqi-foot"><span>Dominant pollutant <b>{result?.dominantPollutant??"—"}</b></span><span>Confidence <b>{result?.confidence??"—"}%</b></span></div></div>
  <div className="insight-card"><div className="card-top"><span>LOCATION SNAPSHOT</span><MapPin size={17}/></div><h2>{city}</h2><p>{live?.city?.state??"India"} · Air quality grid estimate</p><div className="metric-grid"><Metric label="PM2.5" value={live?.pollutants?.pm25} unit="µg/m³"/><Metric label="PM10" value={live?.pollutants?.pm10} unit="µg/m³"/><Metric label="NO₂" value={live?.pollutants?.no2} unit="µg/m³"/><Metric label="O₃" value={live?.pollutants?.o3} unit="µg/m³"/></div><div className="source-note"><span className="pulse-dot"/> {live?.source??"Connecting to data provider"}</div></div>
 </div>
 <div className="section-heading"><div><h2>Air quality intelligence</h2><p>Key signals from your selected location</p></div><button className="text-btn" onClick={()=>setPage("Model Insights")}>Explore model insights <ArrowUpRight size={15}/></button></div>
 <div className="stat-grid"><Stat icon={<Activity/>} label="Ensemble prediction" value={result?.aqi??"—"} suffix="AQI" color="teal"/><Stat icon={<BrainCircuit/>} label="Models combined" value="03" suffix="learners" color="blue"/><Stat icon={<HeartPulse/>} label="Health guidance" value={result?.advisory?.length??"—"} suffix="recommendations" color="orange"/></div>
 <div className="panel chart-panel"><div className="panel-head"><div><h3>Forecast trend</h3><p>Sampled hourly ensemble estimates · next 5 days</p></div><button className="text-btn" onClick={()=>setPage("Forecast")}>Full forecast <ArrowUpRight size={15}/></button></div>{chartData.length?<TrendChart data={chartData}/>:<div className="empty-state"><CloudSun size={25}/>Forecast loads when you open the Forecast page.</div>}</div>
 <div className="disclaimer"><Leaf size={19}/><div><b>Data transparency matters</b><p>Open-Meteo provides CAMS-based modelled pollutant estimates, not a physical monitoring-station reading. Use CPCB/validated station data for official decisions.</p></div></div>
 </>;
}
function Metric({label,value,unit}:any){return <div className="metric"><small>{label}</small><b>{typeof value==="number"?value.toFixed(1):"—"}</b><span>{unit}</span></div>}
function Stat({icon,label,value,suffix,color}:any){return <div className="stat-card"><div className={`stat-icon ${color}`}>{icon}</div><div><small>{label}</small><div className="stat-value">{value} <span>{suffix}</span></div></div></div>}
function TrendChart({data}:any){return <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#e8eeec"/><XAxis dataKey="time" tick={{fontSize:10,fill:"#80908c"}} interval="preserveStartEnd"/><YAxis tick={{fontSize:10,fill:"#80908c"}}/><Tooltip/><Line type="monotone" dataKey="aqi" stroke="#168a78" strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></div>}
function Stations({stations,message,filter,setFilter,loadStations}:any){
 return <><PageTitle eyebrow="MONITORING NETWORK" title="Live monitoring stations" desc="Explore air-quality monitoring locations and their available metadata." action={<button className="btn btn-secondary" onClick={()=>loadStations()}><RefreshCw size={16}/> Refresh</button>}/><div className="filter-row"><div className="searchbox compact"><Search size={17}/><input placeholder="Search station or city" onChange={e=>setFilter(e.target.value||"All")}/></div><div className="filter-select"><SlidersHorizontal size={16}/><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>West Bengal</option><option>Delhi</option><option>Maharashtra</option></select></div></div><div className="panel"><div className="panel-head"><div><h3>Station directory</h3><p>{stations.length} stations returned by configured provider</p></div><span className="source-chip">OPENAQ V3</span></div>{stations.length?<div className="table-scroll"><table><thead><tr><th>Station</th><th>City / State</th><th>Source</th><th>Latest sensor readings</th><th>Last update</th><th>Coordinates</th></tr></thead><tbody>{stations.map((s:Station)=><tr key={s.id}><td><b>{s.name}</b><small>ID {s.id}</small></td><td>{s.city}, {s.state}</td><td>{s.source}</td><td>{Object.entries(s.pollutants).length ? Object.entries(s.pollutants).map(([k,v])=>`${k.toUpperCase()}: ${Number(v).toFixed(1)}`).join(" · ") : "No latest values"}</td><td>{s.updatedAt}</td><td>{s.lat.toFixed(3)}, {s.lon.toFixed(3)}</td></tr>)}</tbody></table></div>:<div className="empty-state"><RadioTower size={26}/><b>No station data connected yet</b><p>{message}</p><p>Set OPENAQ_API_KEY in the server environment to enable OpenAQ v3 station discovery.</p></div>}</div><div className="disclaimer"><AlertTriangle size={18}/><div><b>Measurement availability</b><p>OpenAQ latest values are retrieved from each location endpoint when the provider has reported them. Missing values are shown as missing, not estimated. data.gov.in observations require a valid resource ID and field mapping.</p></div></div></>;
}
function Predict({pollutants,setPollutants,result,submit,loading}:any){
 const fields:[keyof Pollutants,string,string][]=[["pm25","PM2.5","µg/m³"],["pm10","PM10","µg/m³"],["no2","NO₂","µg/m³"],["so2","SO₂","µg/m³"],["co","CO","mg/m³"],["o3","O₃","µg/m³"],["nh3","NH₃","µg/m³"]];
 return <><PageTitle eyebrow="PREDICTIVE ANALYTICS" title="Predict air quality" desc="Enter pollutant concentrations to estimate Indian AQI using the AirSense ensemble pipeline." action={<button className="btn btn-secondary" onClick={()=>setPollutants(empty)}><RefreshCw size={15}/> Reset values</button>}/><div className="predict-layout"><div className="panel form-panel"><div className="panel-head"><div><h3>Pollutant inputs</h3><p>Concentrations in the units shown</p></div><span className="source-chip">7 FEATURES</span></div><div className="input-grid">{fields.map(([key,label,unit])=><label className="field" key={key}><span>{label}<small>{unit}</small></span><input type="number" min="0" step="any" value={pollutants[key]} onChange={e=>setPollutants((p:Pollutants)=>({...p,[key]:Number(e.target.value)}))}/></label>)}</div><div className="form-hint"><AlertTriangle size={15}/> AQI calculation requires at least 3 pollutants, including PM2.5 or PM10, for a CPCB-style station AQI.</div><button className="btn btn-primary full" onClick={submit} disabled={loading}>{loading?"Calculating…":"Run ensemble prediction"} <ArrowUpRight size={16}/></button></div><div className="panel result-panel"><div className="panel-head"><div><h3>Prediction result</h3><p>Weighted ensemble output</p></div><BrainCircuit size={19}/></div>{result?<><div className="result-score"><b style={{color:result.color}}>{result.aqi}</b><span style={{color:result.color}}>{result.category}</span><small>Estimated Indian AQI</small></div><div className="confidence"><span>Input completeness indicator</span><b>{result.confidence}%</b></div><div className="confidence-bar"><i style={{width:`${result.confidence}%`}}/></div><div className="model-output">{Object.entries(result.baseModels).map(([k,v])=><div key={k}><span>{k==="randomForest"?"Random Forest":k==="gradientBoosting"?"Gradient Boosting":"KNN"}</span><b>{v}</b><small>{Math.round((result.weights as any)[k]*100)}% weight</small></div>)}</div><div className="dominant">Dominant pollutant <b>{result.dominantPollutant}</b></div></>:<div className="empty-state"><Gauge size={28}/><p>Submit pollutant values to see the ensemble result.</p></div>}</div></div>{result&&<div className="disclaimer"><AlertTriangle size={18}/><div><b>Model status and limitations</b><p>{result.limitations.join(" ")}</p></div></div>}</>;
}
function Forecast({city,data,load}:any){return <><PageTitle eyebrow="FORWARD-LOOKING INSIGHTS" title="Air quality forecast" desc={`Five-day hourly outlook for ${city}, with pollutant data passed through the ensemble inference layer.`} action={<button className="btn btn-secondary" onClick={()=>load()}><RefreshCw size={15}/> Update forecast</button>}/><div className="panel chart-panel"><div className="panel-head"><div><h3>Ensemble AQI projection</h3><p>Sampled hourly points · local time Asia/Kolkata</p></div><span className="source-chip">5 DAY</span></div>{data.length?<TrendChart data={data}/>:<div className="empty-state"><CloudSun size={26}/>Open this page to fetch forecast data.</div>}</div><div className="disclaimer"><AlertTriangle size={18}/><div><b>Forecast interpretation</b><p>Open-Meteo forecast concentrations are modelled atmospheric estimates. AirSense applies its inference layer to each hour; these are not guaranteed outcomes or official CPCB forecasts.</p></div></div></>}
function WestBengal({stations,message,setCity,loadCity,setPage}:any){const places=["Kolkata","Howrah","Durgapur","Asansol","Siliguri","Haldia"];return <><PageTitle eyebrow="REGIONAL AIR INTELLIGENCE" title="West Bengal air watch" desc="Explore key urban and industrial centres across West Bengal."/><div className="wb-hero"><div><span>REGIONAL COVERAGE</span><h2>West Bengal</h2><p>City-level air-quality estimates, monitoring network discovery and comparative AQI insights.</p></div><div className="wb-count"><b>06</b><small>FOCUS CITIES</small></div></div><div className="city-grid">{places.map((name,i)=><button className="city-card" key={name} onClick={()=>{setCity(name);void loadCity(name);setPage("Dashboard");}}><div className="city-index">0{i+1}</div><b>{name}</b><span>{i===0?"Capital region":i===2||i===3?"Industrial belt":i===4?"Northern gateway":"Regional centre"}</span><ArrowUpRight size={16}/></button>)}</div><div className="panel"><div className="panel-head"><div><h3>Regional station coverage</h3><p>{message}</p></div><span className="source-chip">WEST BENGAL</span></div>{stations.length?<div className="table-scroll"><table><thead><tr><th>Station</th><th>City</th><th>Source</th></tr></thead><tbody>{stations.filter((s:Station)=>s.state.toLowerCase().includes("west bengal")||places.includes(s.city)).map((s:Station)=><tr key={s.id}><td>{s.name}</td><td>{s.city}</td><td>{s.source}</td></tr>)}</tbody></table></div>:<div className="empty-state"><MapPin size={24}/><p>Configure OpenAQ to discover regional stations. City estimates are available through Open-Meteo.</p></div>}</div><div className="disclaimer"><Map size={18}/><div><b>District ranking</b><p>A defensible district ranking requires comparable observations for the same time window and validated district-level station coverage. This starter does not fabricate rankings when those observations are unavailable.</p></div></div></>}
function Health({result}:any){const aqi=result?.aqi??100;const rec=result?.advisory??["Choose a location or run a prediction to generate AQI-specific guidance."];return <><PageTitle eyebrow="PUBLIC HEALTH GUIDANCE" title="Health advisory" desc="Practical, category-based guidance for different levels of air pollution."/><div className="health-current"><div><span>CURRENT SELECTED AQI</span><b style={{color:result?.color??"#9acb3c"}}>{result?.aqi??"—"}</b><strong>{result?.category??"Awaiting prediction"}</strong></div><div className="health-callout"><HeartPulse size={22}/><p>{rec[0]}</p></div></div><div className="advisory-grid">{[["General public","Reduce prolonged outdoor exertion as AQI rises. Follow local alerts and take breaks."],["Children","Limit strenuous outdoor play during poor or worse air quality; schools should follow local advisories."],["Older adults","Reduce outdoor exertion during elevated pollution and seek medical advice for symptoms."],["Asthma / heart patients","Follow your clinician's action plan, keep prescribed medication accessible, and avoid exposure during high AQI."]].map(([t,d])=><div className="panel advisory-card" key={t}><div className="advisory-icon"><HeartPulse size={19}/></div><h3>{t}</h3><p>{d}</p></div>)}</div><div className="panel"><div className="panel-head"><div><h3>Current AQI-specific recommendations</h3><p>{result?.category??"General guidance"}</p></div></div><ul className="advice-list">{rec.map((x:string)=><li key={x}>{x}</li>)}</ul></div><p className="medical-note">This is general educational information, not a medical diagnosis or substitute for advice from a qualified healthcare professional. Follow official local health advisories.</p></>}
function Insights({result}:any){
 const [data,setData]=useState<any>(null);
 useEffect(()=>{void getModelMetrics().then(setData).catch(()=>setData(null));},[]);
 const metrics=data?.metrics?.test_metrics;
 const weights=data?.metrics?.weights;
 const importance=data?.metrics?.feature_importance;
 const modelRows=[{key:"random_forest",name:"Random Forest"},{key:"gradient_boosting",name:"Gradient Boosting"},{key:"knn",name:"K-Nearest Neighbors"},{key:"weighted_ensemble",name:"Weighted Ensemble"}];
 const pct=(v:number)=>`${(v*100).toFixed(1)}%`;
 return <><PageTitle eyebrow="MODEL TRANSPARENCY" title="Understand the ensemble" desc="Inspect validation-derived weights, held-out evaluation and fitted feature importance."/><div className="insight-banner"><BrainCircuit size={25}/><div><b>{data?.trained?"Trained ensemble connected":"Weighted ensemble architecture"}</b><p>{data?.message??"Configure the Python service and train the model to display actual weights and evaluation metrics."}</p></div></div><div className="model-grid">{[{key:"random_forest",name:"Random Forest",description:"Bagged decision trees reduce variance."},{key:"gradient_boosting",name:"Gradient Boosting",description:"Sequential trees fit residual errors."},{key:"knn",name:"K-Nearest Neighbors",description:"Distance-weighted local similarity baseline."}].map(m=><div className="panel model-card" key={m.key}><div className="model-top"><span className="model-dot"/><span>BASE LEARNER</span></div><h3>{m.name}</h3><p>{m.description}</p><div className="weight-label"><span>Validation weight</span><b>{weights?pct(weights[m.key]):"—"}</b></div><div className="confidence-bar"><i style={{width:weights?`${weights[m.key]*100}%`:"0%"}}/></div></div>)}</div><div className="panel"><div className="panel-head"><div><h3>Held-out evaluation metrics</h3><p>{data?.metrics?.target??"Metrics appear after training and are evaluated on the chronological test split."}</p></div><span className="source-chip">{metrics?"TEST SET":"NOT TRAINED"}</span></div><div className="metrics-table"><div><b>Model</b><b>R²</b><b>RMSE</b><b>MAE</b></div>{modelRows.map(m=><div key={m.key}><span>{m.name}</span><span>{metrics?Number(metrics[m.key]?.r2).toFixed(3):"—"}</span><span>{metrics?Number(metrics[m.key]?.rmse).toFixed(2):"—"}</span><span>{metrics?Number(metrics[m.key]?.mae).toFixed(2):"—"}</span></div>)}</div>{data?.metrics&&<div className="empty-note">{data.metrics.rows.toLocaleString()} hourly rows · {data.metrics.split} split · category accuracy {(data.metrics.category_accuracy*100).toFixed(1)}% · target is a model-derived proxy, not observed CPCB AQI.</div>}</div><div className="panel"><div className="panel-head"><div><h3>Random Forest feature importance</h3><p>Relative impurity-based importance from the fitted forest</p></div></div>{importance?<div className="model-output">{Object.entries(importance).sort((a:any,b:any)=>b[1]-a[1]).map(([k,v]:any)=><div key={k}><span>{k}</span><b>{pct(v)}</b></div>)}</div>:<div className="empty-state"><BrainCircuit size={24}/><p>Feature importance will appear after python/train.py completes successfully.</p></div>}</div><div className="disclaimer"><AlertTriangle size={18}/><div><b>Interpretation and limitations</b><p>{data?.metrics?.target??"The TypeScript fallback is a demonstration estimate, not a fitted model. Train the Python model to enable measured ensemble inference."} {result?.limitations?.[0]??""}</p></div></div></>;
}
