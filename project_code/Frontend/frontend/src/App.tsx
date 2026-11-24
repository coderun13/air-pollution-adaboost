import { useEffect, useMemo, useState } from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";
import {
  Sparkles,
  BarChart3,
  Cpu,
  Map as MapIcon,
  ArrowRight,
  Scale,
} from "lucide-react";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { StationsSection } from "./components/StationsSection";
import { PredictorSection } from "./components/PredictorSection";
// import { ModelInsights } from "./components/ModelInsights";
import { Footer } from "./components/footer";
import { DashboardPage } from "./pages/DashboardPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import { MapPage } from "./pages/MapPage";
import { ComparePage } from "./pages/ComparePage";

// import { AlertBanner } from "./components/alerts/AlertBanner";
import { HealthAdvisoryCard } from "./components/alerts/HealthAdvisoryCard";
import { PollutantGrid } from "./components/charts/PollutantGrid";
// import { ForecastComparisonChart } from "./components/charts/ForecastComparisonChart";
import { AqiSpectrumBar } from "./components/charts/AqiSpectrumBar";
import { AirAssistantDrawer } from "./components/assistant/AirAssistantDrawer";
import {
  adaptLiveStationToContext,
  buildForecastSeries,
} from "./utils/stationAdapter";

import {
  FALLBACK_IMPORTANCES,
  FALLBACK_MODELS,
  FALLBACK_STATIONS,
  checkBackendHealth,
  getLiveStations,
  getModelMetrics,
  type FeatureImportanceItem,
  type LiveStation,
  type ModelBenchmark,
  type PollutantInput,
} from "./services/api";

export function App() {
  const location = useLocation();
  const [apiOnline, setApiOnline] = useState(false);
  const [stations, setStations] = useState<LiveStation[]>(FALLBACK_STATIONS);
  const [stationsLiveApi, setStationsLiveApi] = useState(false);
  const [models, setModels] = useState<ModelBenchmark[]>(FALLBACK_MODELS);
  const [featureImportances, setFeatureImportances] =
    useState<FeatureImportanceItem[]>(FALLBACK_IMPORTANCES);
  const [predictorPreset, setPredictorPreset] = useState<PollutantInput | null>(null);

  const [selectedStation, setSelectedStation] = useState<LiveStation>(FALLBACK_STATIONS[0]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function initPlatform() {
      const [healthy, stationsRes, metricsRes] = await Promise.all([
        checkBackendHealth(),
        getLiveStations(),
        getModelMetrics(),
      ]);
      if (!active) return;
      setApiOnline(healthy);
      if (stationsRes.stations.length > 0) {
        setStations(stationsRes.stations);
        setSelectedStation(stationsRes.stations[0]);
      }
      setStationsLiveApi(stationsRes.liveApi);
      setModels(metricsRes.models);
      setFeatureImportances(metricsRes.featureImportances);
    }
    initPlatform();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  const handleLoadStationIntoPredictor = (station: LiveStation) => {
    setSelectedStation(station);
    setPredictorPreset({
      PM2_5: Number(station["PM2.5_avg"] ?? 60),
      PM10: Number(station.PM10_avg ?? 120),
      NO2: Number(station.NO2_avg ?? 35),
      SO2: Number(station.SO2_avg ?? 14),
      CO: Number(station.CO_normalized ?? station.CO_avg ?? 1.0),
      O3: Number(station.OZONE_avg ?? 34),
      NH3: Number(station.NH3_avg ?? 16),
      co_unit: "auto",
    });
  };

  const stationContext = useMemo(
    () => adaptLiveStationToContext(selectedStation ?? stations[0]),
    [selectedStation, stations]
  );

  const forecastSeries = useMemo(
    () => buildForecastSeries(stationContext.aqi, models),
    [stationContext.aqi, models]
  );

  const dominantPollutant = useMemo(() => {
    const active = stationContext.pollutants.filter((p) => p.value !== null);
    if (!active.length) return "PM2.5";
    return active.sort((a, b) => b.value! / b.safeLimit - a.value! / a.safeLimit)[0].id;
  }, [stationContext]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary transition-colors duration-200">
      <Navbar
        apiOnline={apiOnline}
        stations={stations}
        selectedStation={selectedStation}
        onSelectStation={(st) => setSelectedStation(st)}
        activeAlertsCount={stationContext.activeAlerts.length}
        onOpenAssistant={() => {
          setAiPrompt(null);
          setAssistantOpen(true);
        }}
      />

      <main className="flex-1">
        <Routes>
          {/* PAGE 1: Clean Home Overview */}
          <Route
            path="/"
            element={
              <>
                <HeroSection
                  featuredStation={selectedStation ?? stations[0]}
                  totalStationsCount={stations.length}
                  liveApi={stationsLiveApi}
                />

                <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
                  {/* <AlertBanner
                    alerts={stationContext.activeAlerts}
                    onAskAI={(prompt) => {
                      setAiPrompt(prompt);
                      setAssistantOpen(true);
                    }}
                  /> */}

                  <StationsSection
                    stations={stations}
                    liveApi={stationsLiveApi}
                    onSelectForPrediction={handleLoadStationIntoPredictor}
                  />

                  {/* 4-Card Navigation Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                      to="/analytics"
                      className="surface-card group p-5 hover:border-pink-300"
                    >
                      <BarChart3 className="mb-3 h-6 w-6 text-pink-600" />
                      <h3 className="flex items-center justify-between font-semibold text-sm text-text-primary">
                        Pollutant Analytics
                        <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-1 group-hover:text-primary" />
                      </h3>
                      <p className="mt-1.5 text-xs text-text-secondary">
                        Inspect PM2.5, PM10, NO₂, sensor coverage, 24h trends &amp; health risks.
                      </p>
                    </Link>

                    <Link
                      to="/compare"
                      className="surface-card group p-5 hover:border-pink-300"
                    >
                      <Scale className="mb-3 h-6 w-6 text-rose-500" />
                      <h3 className="flex items-center justify-between font-semibold text-sm text-text-primary">
                        City Comparison
                        <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-1 group-hover:text-primary" />
                      </h3>
                      <p className="mt-1.5 text-xs text-text-secondary">
                        Compare two stations head-to-head with radar &amp; hazard share charts.
                      </p>
                    </Link>

                    <Link
                      to="/predict"
                      className="surface-card group p-5 hover:border-pink-300"
                    >
                      <Cpu className="mb-3 h-6 w-6 text-teal-600" />
                      <h3 className="flex items-center justify-between font-semibold text-sm text-text-primary">
                        ML Predictor Lab
                        <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-1 group-hover:text-primary" />
                      </h3>
                      <p className="mt-1.5 text-xs text-text-secondary">
                        Simulate custom AQI scenarios &amp; inspect AdaBoost vs. Decision Tree metrics.
                      </p>
                    </Link>

                    <Link
                      to="/map"
                      className="surface-card group p-5 hover:border-pink-300"
                    >
                      <MapIcon className="mb-3 h-6 w-6 text-pink-500" />
                      <h3 className="flex items-center justify-between font-semibold text-sm text-text-primary">
                        Interactive India Map
                        <ArrowRight className="h-4 w-4 text-text-secondary transition group-hover:translate-x-1 group-hover:text-primary" />
                      </h3>
                      <p className="mt-1.5 text-xs text-text-secondary">
                        Explore regional pollution hotspots and live nodes across India.
                      </p>
                    </Link>
                  </div>
                </div>
              </>
            }
          />

          <Route
            path="/dashboard"
            element={
              <DashboardPage
                stations={stations}
                selectedStation={selectedStation}
                onSelectStation={(st) => setSelectedStation(st)}
                models={models}
                onAskAI={(prompt) => {
                  setAiPrompt(prompt);
                  setAssistantOpen(true);
                }}
              />
            }
          />

          {/* PAGE 2: Pollutants, Forecast & Health Advisory */}
          <Route
            path="/analytics"
            element={
              <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
                <div className="border-b border-border pb-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-dark">
                    Deep-Dive Telemetry
                  </span>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-text-primary">
                    Pollutant Analytics, Forecast &amp; Health Advisory
                  </h1>
                  <p className="mt-1 text-sm text-text-secondary">
                    Showing live parameter breakdown for{" "}
                    <strong className="text-text-primary">
                      {stationContext.stationName}, {stationContext.city}
                    </strong>{" "}
                    (switch stations anytime in the dashboard).
                  </p>
                </div>

                <AqiSpectrumBar
                  aqi={stationContext.aqi}
                  category={stationContext.category}
                />

                {/* <AlertBanner
                  alerts={stationContext.activeAlerts}
                  onAskAI={(prompt) => {
                    setAiPrompt(prompt);
                    setAssistantOpen(true);
                  }}
                /> */}

                <PollutantGrid
                  pollutants={stationContext.pollutants}
                  stationName={`${stationContext.stationName}, ${stationContext.city}`}
                />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    {/* <ForecastComparisonChart
                      data={forecastSeries}
                      city={stationContext.city}
                      models={models}
                    /> */}
                  </div>
                  <HealthAdvisoryCard
                    aqi={stationContext.aqi}
                    category={stationContext.category}
                    dominantPollutant={dominantPollutant}
                  />
                </div>
              </div>
            }
          />

          {/* PAGE 3: Station Comparison */}
          <Route
            path="/compare"
            element={
              <ComparePage
                stations={stations}
                onAskAI={(prompt) => {
                  setAiPrompt(prompt);
                  setAssistantOpen(true);
                }}
              />
            }
          />

          PAGE 4: ML Predictor
          <Route
            path="/predict"
            element={
              <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
                <div className="border-b border-border pb-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-dark">
                    Machine Learning Pipeline
                  </span>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-text-primary">
                    AQI Classifier Simulator &amp; Model Evaluation
                  </h1>
                  <p className="mt-1 text-sm text-text-secondary">
                    Test custom pollutant scenarios and inspect AdaBoost vs. Decision Tree feature weights.
                  </p>
                </div>

                <PredictorSection externalValues={predictorPreset} />

                {/* <ModelInsights
                  models={models}
                  featureImportances={featureImportances}
                /> */}
              </div>
            }
          />

          <Route
            path="/map"
            element={
              <MapPage
                liveApi={stationsLiveApi}
                onSelectForPrediction={handleLoadStationIntoPredictor}
                stations={stations}
              />
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </main>

      {/* Persistent Floating AI Assistant */}
      <button
        type="button"
        onClick={() => {
          setAiPrompt(null);
          setAssistantOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-pink-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-pink-700"
      >
        <Sparkles className="h-4 w-4" /> Ask AIRWATCH AI
      </button>

      <AirAssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        station={stationContext}
        initialPrompt={aiPrompt}
      />

      <Footer />
    </div>
  );
}

export default App;