import type { Pollutants, ModelResult } from "../types";
import { advisory, calculateCpcbAqi, category } from "./aqi";

const FEATURES: (keyof Pollutants)[] = ["pm25","pm10","no2","so2","co","o3","nh3"];
const DEFAULT_WEIGHTS = { randomForest: 0.45, gradientBoosting: 0.35, knn: 0.20 };

// Lightweight, deterministic TypeScript inference fallback. Replace model.json with
// an artifact exported by python/train.py for trained tree/KNN inference.
function engineeredTarget(p: Partial<Pollutants>) {
  const cpcb = calculateCpcbAqi(p);
  if (cpcb.aqi !== null) return cpcb.aqi;
  const pm25 = p.pm25 ?? 35, pm10 = p.pm10 ?? 65;
  return Math.min(500, Math.max(0, pm25 * 2.1, pm10 * 0.9));
}
export function predictEnsemble(p: Partial<Pollutants>): ModelResult {
  const values = FEATURES.map(k => Number.isFinite(p[k]) ? Number(p[k]) : 0);
  const base = engineeredTarget(p);
  const rf = Math.min(500, Math.max(0, base * 0.97 + values[0] * 0.015));
  const gb = Math.min(500, Math.max(0, base * 1.02 - values[1] * 0.006));
  const knn = Math.min(500, Math.max(0, base * 0.94 + (values.reduce((a,b)=>a+b,0) / 7) * 0.025));
  const aqi = Math.round(rf * DEFAULT_WEIGHTS.randomForest + gb * DEFAULT_WEIGHTS.gradientBoosting + knn * DEFAULT_WEIGHTS.knn);
  const cat = category(aqi);
  const cpcb = calculateCpcbAqi(p);
  const present = FEATURES.filter(k => typeof p[k] === "number").length;
  const confidence = Math.max(42, Math.min(92, Math.round(48 + present * 5 + (cpcb.aqi !== null ? 8 : 0))));
  return {
    aqi, category: cat.name, color: cat.color, confidence,
    baseModels: { randomForest: Math.round(rf), gradientBoosting: Math.round(gb), knn: Math.round(knn) },
    weights: DEFAULT_WEIGHTS,
    pollutantSubindices: cpcb.subindices,
    dominantPollutant: cpcb.dominant,
    advisory: advisory(aqi),
    limitations: ["Demo inference uses a transparent CPCB-breakpoint-derived fallback, not a fitted model artifact.",
      "Confidence is a heuristic completeness indicator, not a calibrated probability.",
      "For official reporting, train and export the Python scikit-learn models, then replace the fallback inference artifact."]
  };
}
