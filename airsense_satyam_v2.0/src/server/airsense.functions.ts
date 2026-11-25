import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { predictEnsemble } from "../lib/ensemble";
import type { City, Pollutants, Station } from "../types";

const citySchema = z.object({ city: z.string().min(2).max(80) });
const predictSchema = z.object({
  pm25: z.number().min(0).max(2000).optional(), pm10: z.number().min(0).max(3000).optional(),
  no2: z.number().min(0).max(5000).optional(), so2: z.number().min(0).max(5000).optional(),
  co: z.number().min(0).max(100).optional(), o3: z.number().min(0).max(5000).optional(),
  nh3: z.number().min(0).max(5000).optional()
});
const cities: City[] = [
  {name:"Kolkata",state:"West Bengal",lat:22.5726,lon:88.3639},
  {name:"Howrah",state:"West Bengal",lat:22.5958,lon:88.2636},
  {name:"Durgapur",state:"West Bengal",lat:23.5204,lon:87.3119},
  {name:"Asansol",state:"West Bengal",lat:23.6739,lon:86.9524},
  {name:"Siliguri",state:"West Bengal",lat:26.7271,lon:88.3953},
  {name:"Haldia",state:"West Bengal",lat:22.0667,lon:88.0698},
  {name:"Deoghar",state:"Jharkhand",lat:24.4854,lon:86.6947},
  {name:"Delhi",state:"Delhi",lat:28.6139,lon:77.2090},
  {name:"Mumbai",state:"Maharashtra",lat:19.0760,lon:72.8777},
  {name:"Bengaluru",state:"Karnataka",lat:12.9716,lon:77.5946},
  {name:"Chennai",state:"Tamil Nadu",lat:13.0827,lon:80.2707},
  {name:"Hyderabad",state:"Telangana",lat:17.3850,lon:78.4867}
];
const hourlyVars = "pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,ammonia";

export const searchCity = createServerFn({ method: "GET" })
  .validator(citySchema)
  .handler(async ({ data }) => {
    const q = data.city.toLowerCase();
    const city = cities.find(c => c.name.toLowerCase() === q) ??
      cities.find(c => c.name.toLowerCase().includes(q));
    if (!city) throw new Error("City not found in the starter city index. Try Kolkata, Delhi, Mumbai, Bengaluru, Chennai, Hyderabad, or Deoghar.");
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.search = new URLSearchParams({ latitude:String(city.lat), longitude:String(city.lon), hourly:hourlyVars, forecast_days:"5", past_days:"1", timezone:"Asia/Kolkata" }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Open-Meteo request failed (${response.status})`);
    const json = await response.json();
    const h = json.hourly;
    const localNow = new Intl.DateTimeFormat("sv-SE", { timeZone:"Asia/Kolkata", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23" }).format(new Date()).replace(" ", "T");
    let latest = 0;
    for (let i = 0; i < h.time.length; i++) { if (h.time[i] <= localNow) latest = i; else break; }
    const p: Pollutants = {
      pm25: h.pm2_5?.[latest] ?? 0, pm10: h.pm10?.[latest] ?? 0,
      no2: h.nitrogen_dioxide?.[latest] ?? 0, so2: h.sulphur_dioxide?.[latest] ?? 0,
      co: (h.carbon_monoxide?.[latest] ?? 0) / 1000, o3: h.ozone?.[latest] ?? 0, nh3: h.ammonia?.[latest] ?? 0
    };
    return { city, pollutants:p, observedAt:h.time[latest], hourly:h, source:"Open-Meteo CAMS modelled air-quality data" };
  });

export const predictAqi = createServerFn({ method: "POST" })
  .validator(predictSchema)
  .handler(async ({ data }) => {
    // Prefer the fitted scikit-learn service. The local TypeScript estimate is
    // explicitly a fallback for UI development when the Python API is offline.
    const mlUrl = process.env.AIRSENSE_ML_API_URL;
    if (mlUrl) {
      try {
        const payload = {
          pm2_5: data.pm25, pm10: data.pm10, nitrogen_dioxide: data.no2,
          sulphur_dioxide: data.so2, carbon_monoxide: data.co,
          ozone: data.o3, ammonia: data.nh3
        };
        const response = await fetch(`${mlUrl.replace(/\/$/, "")}/predict`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify(payload), signal: AbortSignal.timeout(12000)
        });
        if (response.ok) {
          const trained: any = await response.json();
          const cpcb = predictEnsemble(data);
          const color = trained.aqi <= 50 ? "#9acb3c" : trained.aqi <= 100 ? "#d6d83e" : trained.aqi <= 200 ? "#f3a43b" : trained.aqi <= 300 ? "#e76b42" : trained.aqi <= 400 ? "#bd4b70" : "#8b3f88";
          const keys = { random_forest: "randomForest", gradient_boosting: "gradientBoosting", knn: "knn" } as const;
          const baseModels: any = {}, weights: any = {};
          for (const [source, target] of Object.entries(keys)) {
            baseModels[target] = Math.round(trained.base_models[source] ?? trained.aqi);
            weights[target] = trained.weights[source] ?? 0;
          }
          return { ...cpcb, aqi: trained.aqi, category: trained.category, color,
            confidence: 100, baseModels, weights,
            limitations: [trained.target_note, "Model confidence is not a calibrated probability.", "For official reporting, compare against validated CPCB reference-station AQI observations."] };
        }
      } catch { /* fall through to explicit development fallback */ }
    }
    return predictEnsemble(data);
  });

export const getForecast = createServerFn({ method: "GET" })
  .validator(citySchema)
  .handler(async ({ data }) => {
    const q = data.city.toLowerCase();
    const city = cities.find(c => c.name.toLowerCase() === q) ?? cities.find(c => c.name.toLowerCase().includes(q));
    if (!city) throw new Error("City not found.");
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.search = new URLSearchParams({ latitude:String(city.lat), longitude:String(city.lon), hourly:hourlyVars, forecast_days:"5", timezone:"Asia/Kolkata" }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error("Forecast provider unavailable.");
    const json = await res.json();
    const h = json.hourly;
    const rows: Pollutants[] = h.time.map((_:string, i:number) => ({ pm25:h.pm2_5?.[i]??0, pm10:h.pm10?.[i]??0, no2:h.nitrogen_dioxide?.[i]??0, so2:h.sulphur_dioxide?.[i]??0, co:(h.carbon_monoxide?.[i]??0)/1000, o3:h.ozone?.[i]??0, nh3:h.ammonia?.[i]??0 }));
    let predictions:any[] = rows.map(p => predictEnsemble(p));
    const mlUrl = process.env.AIRSENSE_ML_API_URL;
    if (mlUrl) {
      try {
        const batch = await fetch(`${mlUrl.replace(/\/$/, "")}/predict/batch`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(rows.map(p=>({pm2_5:p.pm25,pm10:p.pm10,nitrogen_dioxide:p.no2,sulphur_dioxide:p.so2,carbon_monoxide:p.co,ozone:p.o3,ammonia:p.nh3}))), signal:AbortSignal.timeout(20000) });
        if (batch.ok) predictions = await batch.json();
      } catch { /* use the disclosed TypeScript fallback for this forecast */ }
    }
    const points = h.time.map((time:string,i:number) => ({ time, ...predictions[i], pm25:rows[i].pm25, pm10:rows[i].pm10 }));
    return { city, points, source:mlUrl && predictions[0]?.model === "trained_scikit_learn_ensemble" ? "Open-Meteo CAMS forecast + trained Python ensemble" : "Open-Meteo CAMS forecast + TypeScript demonstration fallback" };
  });

export const getModelMetrics = createServerFn({ method: "GET" })
  .handler(async () => {
    const mlUrl = process.env.AIRSENSE_ML_API_URL;
    if (!mlUrl) return { trained:false, metrics:null, message:"Set AIRSENSE_ML_API_URL and train the Python model to load evaluation metrics." };
    try {
      const response = await fetch(`${mlUrl.replace(/\/$/, "")}/metrics`, { signal:AbortSignal.timeout(8000) });
      if (!response.ok) return { trained:false, metrics:null, message:"Python model metrics are not available. Run python/train.py first." };
      return { trained:true, metrics:await response.json(), message:"Metrics from the held-out chronological test split." };
    } catch { return { trained:false, metrics:null, message:"Python ML service is offline or unreachable." }; }
  });

export const getStations = createServerFn({ method: "GET" })
  .validator(z.object({ city:z.string().optional(), state:z.string().optional() }))
  .handler(async ({ data }) => {
    const key = process.env.OPENAQ_API_KEY;
    if (!key) return { stations: [] as Station[], configured:false, message:"OpenAQ API key not configured. Add OPENAQ_API_KEY to .env to enable ground-monitor station readings." };
    const target = data.city ? cities.find(c => c.name.toLowerCase() === data.city!.toLowerCase()) : undefined;
    const regionalTargets = !target && data.state ? cities.filter(c => c.state.toLowerCase() === data.state!.toLowerCase()) : [];
    const headers = { "X-API-Key": key };
    const fetchLocations = async (center?:City) => {
      const params = new URLSearchParams({ iso:"IN", limit:"100", page:"1" });
      if (center) { params.set("coordinates", `${center.lat},${center.lon}`); params.set("radius", "25000"); }
      const response = await fetch(`https://api.openaq.org/v3/locations?${params}`, { headers, signal:AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`OpenAQ location lookup failed (${response.status})`);
      const body = await response.json();
      return (body.results ?? []).map((x:any)=>({...x, _targetCity:center?.name}));
    };
    let locations:any[];
    try {
      const groups = regionalTargets.length ? await Promise.all(regionalTargets.map(c=>fetchLocations(c))) : [await fetchLocations(target)];
      locations = [...new Map(groups.flat().map((x:any)=>[String(x.id),x])).values()];
    } catch (error) { return { stations:[] as Station[], configured:true, message:error instanceof Error?error.message:"OpenAQ location lookup failed." }; }
    locations = locations.filter((x:any) => !data.state || String(x.state ?? data.state).toLowerCase().includes(data.state!.toLowerCase()));
    const stations:Station[] = await Promise.all(locations.slice(0,30).map(async (x:any) => {
      let pollutants: Partial<Pollutants> = {};
      let updatedAt = x.datetimeLast?.utc ?? x.datetimeLast?.local ?? "Not supplied";
      try {
        const latestRes = await fetch(`https://api.openaq.org/v3/locations/${x.id}/latest?limit=100&page=1`, { headers, signal:AbortSignal.timeout(10000) });
        if (latestRes.ok) {
          const latestBody = await latestRes.json();
          for (const item of latestBody.results ?? []) {
            const name = String(item.parameter?.name ?? item.parameter?.displayName ?? "").toLowerCase().replace(/[₂₃.\s-]/g, "");
            const value = Number(item.value);
            if (!Number.isFinite(value)) continue;
            if (name.includes("pm25") || name.includes("pm2_5")) pollutants.pm25 = value;
            else if (name.includes("pm10")) pollutants.pm10 = value;
            else if (name === "no2" || name.includes("nitrogendioxide")) pollutants.no2 = value;
            else if (name === "so2" || name.includes("sulfurdioxide") || name.includes("sulphurdioxide")) pollutants.so2 = value;
            else if (name === "o3" || name.includes("ozone")) pollutants.o3 = value;
            else if (name === "co" || name.includes("carbonmonoxide")) pollutants.co = (item.unit ?? item.parameter?.units) === "µg/m³" || (item.unit ?? item.parameter?.units) === "ug/m3" ? value / 1000 : value;
            else if (name === "nh3" || name.includes("ammonia")) pollutants.nh3 = value;
            const dt = item.datetime?.utc ?? item.datetime?.local;
            if (dt && (updatedAt === "Not supplied" || dt > updatedAt)) updatedAt = dt;
          }
        }
      } catch { /* preserve station metadata if the latest endpoint is unavailable */ }
      return { id:String(x.id), name:x.name ?? "Unnamed station", city:x.locality ?? x.city ?? x._targetCity ?? target?.name ?? "Unknown",
        state:x.state ?? "India", source:"OpenAQ v3", updatedAt, pollutants,
        lat:x.coordinates?.latitude ?? 0, lon:x.coordinates?.longitude ?? 0 } as Station;
    }));
    const withReadings = stations.filter(s => Object.keys(s.pollutants).length > 0).length;
    return { stations, configured:true, message:`${stations.length} OpenAQ locations found; ${withReadings} returned at least one latest sensor reading. Coverage depends on upstream reporting and is not complete for every city.` };
  });

export const getCpcbObservations = createServerFn({ method: "GET" })
  .validator(z.object({ limit:z.number().int().min(1).max(100).optional() }))
  .handler(async ({ data }) => {
    const key = process.env.DATA_GOV_IN_API_KEY;
    const resource = process.env.DATA_GOV_IN_RESOURCE_ID;
    if (!key || !resource) return { configured:false, records:[], message:"Set DATA_GOV_IN_API_KEY and DATA_GOV_IN_RESOURCE_ID after selecting the appropriate CPCB/air-quality resource on data.gov.in." };
    const url = new URL(`https://api.data.gov.in/resource/${resource}`);
    url.search = new URLSearchParams({ "api-key":key, format:"json", limit:String(data.limit ?? 50) }).toString();
    const response = await fetch(url, { signal:AbortSignal.timeout(15000) });
    if (!response.ok) return { configured:true, records:[], message:`data.gov.in returned ${response.status}. Verify the resource ID and API key.` };
    const payload = await response.json();
    return { configured:true, records:payload.records ?? [], fields:payload.field ?? [], message:`Loaded ${payload.records?.length ?? 0} records from the configured data.gov.in resource. Validate its fields, units and station averaging semantics before treating it as reference AQI.` };
  });
