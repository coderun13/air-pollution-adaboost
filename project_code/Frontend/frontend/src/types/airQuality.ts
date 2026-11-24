export type AQICategory = 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe';

export type AlertEngineVersion = 'V1: Rule-Based' | 'V2: Forecast-Driven' | 'V3: AI-Explained';

export type SensitiveGroup = 'general' | 'respiratory' | 'athletes' | 'elderly_children';

export interface PollutantReading {
  id: 'PM2.5' | 'PM10' | 'NO2' | 'CO' | 'SO2' | 'O3' | 'NH3' | 'Benzene';
  name: string;
  value: number | null; // null represents missing/unreported sensor data
  unit: string;
  safeLimit: number;
  trend: 'rising' | 'falling' | 'stable';
  changePercent: number;
  history24h: number[];
  sourceHint: string;
  isCore?: boolean;
}

export interface AirAlert {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'critical';
  engineVersion: AlertEngineVersion;
  triggerRule: string;
  summary: string;
  aiExplanation?: string;
  timestamp: string;
  affectedPollutant?: string;
}

export interface ForecastPoint {
  time: string;
  actual?: number;
  randomForest: number;
  xgboost: number;
  lstm: number;
  confidenceLow: number;
  confidenceHigh: number;
}

export interface StationContext {
  city: string;
  stationName: string;
  aqi: number;
  category: AQICategory;
  lastUpdated: string;
  isStale: boolean;
  pollutants: PollutantReading[];
  activeAlerts: AirAlert[];
}