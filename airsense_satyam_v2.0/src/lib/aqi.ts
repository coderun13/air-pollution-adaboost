import type { Pollutants } from "../types";

// CPCB India AQI concentration breakpoints and AQI bands.
// CO is expressed in mg/m3; other pollutants in µg/m3.
const bands: Record<string, [number, number, number, number][]> = {
  pm25: [[0,30,0,50],[31,60,51,100],[61,90,101,200],[91,120,201,300],[121,250,301,400],[251,500,401,500]],
  pm10: [[0,50,0,50],[51,100,51,100],[101,250,101,200],[251,350,201,300],[351,430,301,400],[431,600,401,500]],
  no2: [[0,40,0,50],[41,80,51,100],[81,180,101,200],[181,280,201,300],[281,400,301,400],[401,1000,401,500]],
  so2: [[0,40,0,50],[41,80,51,100],[81,380,101,200],[381,800,201,300],[801,1600,301,400],[1601,2000,401,500]],
  co: [[0,1,0,50],[1.1,2,51,100],[2.1,10,101,200],[10.1,17,201,300],[17.1,34,301,400],[34.1,50,401,500]],
  o3: [[0,50,0,50],[51,100,51,100],[101,168,101,200],[169,208,201,300],[209,748,301,400],[749,1000,401,500]],
  nh3: [[0,200,0,50],[201,400,51,100],[401,800,101,200],[801,1200,201,300],[1201,1800,301,400],[1801,2400,401,500]]
};

export function subIndex(key: keyof Pollutants, value: number): number | null {
  const band = bands[key]?.find(([lo, hi]) => value >= lo && value <= hi);
  if (!band) return value < 0 ? null : 500;
  const [bLo,bHi,iLo,iHi] = band;
  return Math.round(((iHi-iLo)/(bHi-bLo))*(value-bLo)+iLo);
}

export function calculateCpcbAqi(p: Partial<Pollutants>) {
  const entries = (Object.keys(bands) as (keyof Pollutants)[])
    .filter(k => typeof p[k] === "number")
    .map(k => [k, subIndex(k, p[k] as number)] as const)
    .filter((x): x is readonly [keyof Pollutants, number] => x[1] !== null);
  const particulatePresent = typeof p.pm25 === "number" || typeof p.pm10 === "number";
  if (entries.length < 3 || !particulatePresent) return { aqi: null, subindices: Object.fromEntries(entries), dominant: "Insufficient data" };
  const worst = entries.reduce((a,b) => a[1] >= b[1] ? a : b);
  return { aqi: worst[1], subindices: Object.fromEntries(entries), dominant: worst[0] };
}

export function category(aqi: number) {
  if (aqi <= 50) return { name: "Good", color: "#20b77a" };
  if (aqi <= 100) return { name: "Satisfactory", color: "#9acb3c" };
  if (aqi <= 200) return { name: "Moderate", color: "#f2c94c" };
  if (aqi <= 300) return { name: "Poor", color: "#f2994a" };
  if (aqi <= 400) return { name: "Very Poor", color: "#eb5757" };
  return { name: "Severe", color: "#8e244d" };
}

export function advisory(aqi: number): string[] {
  if (aqi <= 50) return ["Everyone: Enjoy normal outdoor activities.","Children and older adults: Normal activity is generally appropriate."];
  if (aqi <= 100) return ["Sensitive people: Consider reducing prolonged, heavy outdoor exertion.","General public: Unusually sensitive people may experience minor breathing discomfort."];
  if (aqi <= 200) return ["Children, older adults and people with asthma or heart disease: Reduce prolonged outdoor exertion.","General public: Consider reducing prolonged, heavy outdoor activity."];
  if (aqi <= 300) return ["Sensitive groups: Avoid prolonged outdoor exertion; follow your clinician's action plan.","General public: Reduce prolonged outdoor exertion and take more breaks."];
  if (aqi <= 400) return ["Everyone: Avoid prolonged outdoor exertion; keep outdoor activity light.","People with asthma or heart disease: Stay indoors when possible and follow medical advice."];
  return ["Everyone: Avoid outdoor physical activity; remain indoors with cleaner air where possible.","Children, older adults and people with heart or lung conditions: Take extra precautions and seek medical advice if symptoms worsen."];
}
