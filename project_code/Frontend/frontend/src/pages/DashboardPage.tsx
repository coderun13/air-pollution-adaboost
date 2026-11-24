import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Sparkles, ArrowRight } from "lucide-react";
import type { LiveStation, ModelBenchmark } from "../services/api";
import { adaptLiveStationToContext, buildForecastSeries } from "../utils/stationAdapter";
import { AlertBanner } from "../components/alerts/AlertBanner";
import { HealthAdvisoryCard } from "../components/alerts/HealthAdvisoryCard";
import { PollutantGrid } from "../components/charts/PollutantGrid";
import { ForecastComparisonChart } from "../components/charts/ForecastComparisonChart";
import { AqiSpectrumBar } from "../components/charts/AqiSpectrumBar";

interface DashboardPageProps {
  stations: LiveStation[];
  selectedStation: LiveStation;
  onSelectStation: (station: LiveStation) => void;
  models: ModelBenchmark[];
  onAskAI: (prompt: string) => void;
}

export function DashboardPage({
  stations,
  selectedStation,
  onSelectStation,
  models,
  onAskAI,
}: DashboardPageProps) {
  const stationContext = useMemo(
    () => adaptLiveStationToContext(selectedStation),
    [selectedStation]
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
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Station Selector & Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-light bg-white p-6 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-dark">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            All-India Live Command View
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-text-primary sm:text-3xl">
            {stationContext.city} Air Quality Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-text-secondary">
            Station: <strong className="text-text-primary">{stationContext.stationName}</strong> ·
            Category: <strong className="text-primary-dark">{stationContext.category}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Choose monitoring station"
            value={selectedStation?.station ?? ""}
            onChange={(e) => {
              const found = stations.find((s) => s.station === e.target.value);
              if (found) onSelectStation(found);
            }}
            className="field-input w-64 bg-[#FAF8F6]"
          >
            {stations.map((st, idx) => (
              <option key={`${st.station}-${idx}`} value={st.station ?? ""}>
                {st.city ? `${st.city} — ${st.station}` : st.station}
              </option>
            ))}
          </select>

          <Link to="/predict" className="btn-primary text-xs sm:text-sm">
            Simulate AQI <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* AQI Spectrum */}
      <AqiSpectrumBar aqi={stationContext.aqi} category={stationContext.category} />

      {/* Active Alerts */}
      {/* <AlertBanner
        alerts={stationContext.activeAlerts}
        onAskAI={(prompt) => onAskAI(prompt)}
      /> */}

      {/* Pollutant Breakdown */}
      <PollutantGrid
        pollutants={stationContext.pollutants}
        stationName={`${stationContext.stationName}, ${stationContext.city}`}
      />

      {/* Forecast + Health Advisory */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* <div className="lg:col-span-2">
          <ForecastComparisonChart
            data={forecastSeries}
            city={stationContext.city}
            models={models}
          />
        </div> */}
        <HealthAdvisoryCard
          aqi={stationContext.aqi}
          category={stationContext.category}
          dominantPollutant={dominantPollutant}
        />
      </div>

      {/* Quick AI Prompt Bar */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-50 via-white to-rose-50 p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-base font-bold text-text-primary">
            Want a quick summary of {stationContext.city}?
          </h2>
          <p className="text-xs text-text-secondary">
            Open the AIRWATCH AI assistant for plain-language insights on {dominantPollutant} and
            outdoor precautions.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onAskAI(
              `Summarize air quality, ${dominantPollutant}, and health advice for ${stationContext.city}.`
            )
          }
          className="btn-secondary shrink-0"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          Ask AIRWATCH AI
        </button>
      </div>
    </div>
  );
}