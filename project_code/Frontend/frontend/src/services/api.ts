const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || "http://127.0.0.1:8000";

export type CoUnit = "auto" | "mg/m3" | "ug/m3";

export interface PollutantInput {
  PM2_5: number;
  PM10: number;
  NO2: number;
  SO2: number;
  CO: number;
  O3: number;
  NH3: number;
  co_unit?: CoUnit;
}

export interface PredictionResult {
  predicted_aqi_category: string;
  confidence: number | null;
  class_probabilities: Record<string, number>;
  normalized_features_used: Record<string, number>;
  disclaimer?: string;
}

export interface LiveStation {
  city?: string;
  state?: string;
  station?: string;
  last_update_iso?: string;
  "PM2.5_avg"?: number;
  PM10_avg?: number;
  NO2_avg?: number;
  SO2_avg?: number;
  CO_avg?: number;
  CO_normalized?: number;
  OZONE_avg?: number;
  NH3_avg?: number;
  ml_predicted_category?: string | null;
  ml_confidence?: number | null;
  [key: string]: unknown;
}

export interface ModelBenchmark {
  model: string;
  macro_f1: number;
  accuracy?: number;
  [key: string]: unknown;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export const FALLBACK_STATIONS: LiveStation[] = [
  {
    city: "Delhi",
    state: "Delhi",
    station: "Anand Vihar, Delhi - DPCC",
    "PM2.5_avg": 168.4,
    PM10_avg: 294.0,
    NO2_avg: 74.2,
    SO2_avg: 18.6,
    CO_normalized: 1.85,
    OZONE_avg: 36.0,
    NH3_avg: 42.1,
    ml_predicted_category: "Very Poor",
    ml_confidence: 0.94,
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
    station: "Bandra Kurla Complex, Mumbai - MPCB",
    "PM2.5_avg": 64.2,
    PM10_avg: 128.5,
    NO2_avg: 38.4,
    SO2_avg: 11.2,
    CO_normalized: 0.92,
    OZONE_avg: 41.5,
    NH3_avg: 16.8,
    ml_predicted_category: "Moderate",
    ml_confidence: 0.91,
  },
  {
    city: "Kolkata",
    state: "West Bengal",
    station: "Rabindra Bharati University, Kolkata - WBPCB",
    "PM2.5_avg": 92.6,
    PM10_avg: 176.0,
    NO2_avg: 49.8,
    SO2_avg: 14.5,
    CO_normalized: 1.18,
    OZONE_avg: 29.4,
    NH3_avg: 21.3,
    ml_predicted_category: "Moderate",
    ml_confidence: 0.89,
  },
  {
    city: "Bengaluru",
    state: "Karnataka",
    station: "BTM Layout, Bengaluru - KSPCB",
    "PM2.5_avg": 28.5,
    PM10_avg: 66.0,
    NO2_avg: 22.1,
    SO2_avg: 7.4,
    CO_normalized: 0.64,
    OZONE_avg: 34.2,
    NH3_avg: 11.0,
    ml_predicted_category: "Satisfactory",
    ml_confidence: 0.95,
  },
  {
    city: "Chennai",
    state: "Tamil Nadu",
    station: "Alandur Bus Depot, Chennai - CPCB",
    "PM2.5_avg": 34.8,
    PM10_avg: 78.2,
    NO2_avg: 19.6,
    SO2_avg: 9.8,
    CO_normalized: 0.71,
    OZONE_avg: 38.0,
    NH3_avg: 13.4,
    ml_predicted_category: "Satisfactory",
    ml_confidence: 0.92,
  },
  {
    city: "Hyderabad",
    state: "Telangana",
    station: "Sanathnagar, Hyderabad - TSPCB",
    "PM2.5_avg": 52.3,
    PM10_avg: 110.4,
    NO2_avg: 31.7,
    SO2_avg: 12.1,
    CO_normalized: 0.84,
    OZONE_avg: 35.6,
    NH3_avg: 15.2,
    ml_predicted_category: "Moderate",
    ml_confidence: 0.9,
  },
];

export const FALLBACK_MODELS: ModelBenchmark[] = [
  { model: "AdaBoost_Primary", macro_f1: 0.9072, accuracy: 0.9624 },
  { model: "DecisionTree_Baseline", macro_f1: 0.7937, accuracy: 0.9218 },
];

export const FALLBACK_IMPORTANCES: FeatureImportanceItem[] = [
  { feature: "PM2_5", importance: 0.43 },
  { feature: "PM10", importance: 0.27 },
  { feature: "CO", importance: 0.12 },
  { feature: "NO2", importance: 0.08 },
  { feature: "O3", importance: 0.05 },
  { feature: "SO2", importance: 0.03 },
  { feature: "NH3", importance: 0.02 },
];

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getLiveStations(filters?: {
  city?: string;
  state?: string;
}): Promise<{ stations: LiveStation[]; liveApi: boolean }> {
  try {
    const url = new URL(`${API_BASE_URL}/stations/live`);
    if (filters?.city && filters.city !== "All") {
      url.searchParams.set("city", filters.city);
    }
    if (filters?.state && filters.state !== "All") {
      url.searchParams.set("state", filters.state);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const list: LiveStation[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.stations)
        ? data.stations
        : [];

    return { stations: list, liveApi: true };
  } catch {
    const filtered = FALLBACK_STATIONS.filter((st) => {
      const cityMatch =
        !filters?.city ||
        filters.city === "All" ||
        String(st.city || "").toLowerCase() === filters.city.toLowerCase();
      const stateMatch =
        !filters?.state ||
        filters.state === "All" ||
        String(st.state || "").toLowerCase() === filters.state.toLowerCase();
      return cityMatch && stateMatch;
    });
    return { stations: filtered, liveApi: false };
  }
}

export async function getModelMetrics(): Promise<{
  models: ModelBenchmark[];
  featureImportances: FeatureImportanceItem[];
  liveApi: boolean;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/models/metrics`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const models: ModelBenchmark[] = Array.isArray(data?.models)
      ? data.models
      : FALLBACK_MODELS;
    const importances: FeatureImportanceItem[] = Array.isArray(
      data?.adaboost_feature_importances
    )
      ? data.adaboost_feature_importances
      : FALLBACK_IMPORTANCES;

    return {
      models,
      featureImportances: importances,
      liveApi: true,
    };
  } catch {
    return {
      models: FALLBACK_MODELS,
      featureImportances: FALLBACK_IMPORTANCES,
      liveApi: false,
    };
  }
}

export async function runAqiPrediction(
  payload: PollutantInput
): Promise<PredictionResult> {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      co_unit: payload.co_unit ?? "auto",
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Prediction failed with status ${response.status}`);
  }

  return response.json();
}