export type Pollutants = {
  pm25: number; pm10: number; no2: number; so2: number;
  co: number; o3: number; nh3: number;
};
export type City = { name: string; state: string; lat: number; lon: number };
export type Station = {
  id: string; name: string; city: string; state: string; source: string;
  updatedAt: string; pollutants: Partial<Pollutants>; lat: number; lon: number;
};
export type ModelResult = {
  aqi: number; category: string; color: string; confidence: number;
  baseModels: { randomForest: number; gradientBoosting: number; knn: number };
  weights: { randomForest: number; gradientBoosting: number; knn: number };
  pollutantSubindices: Record<string, number | null>;
  dominantPollutant: string;
  advisory: string[];
  limitations: string[];
};
