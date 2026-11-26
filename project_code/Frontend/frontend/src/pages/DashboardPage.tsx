import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Sparkles, ArrowRight } from "lucide-react";
import type { LiveStation, ModelBenchmark } from "../services/api";
import { adaptLiveStationToContext } from "../utils/stationAdapter";
import { HealthAdvisoryCard } from "../components/alerts/HealthAdvisoryCard";
import { PollutantGrid } from "../components/charts/PollutantGrid";
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
  onAskAI,
}: DashboardPageProps) {
  const stationContext = useMemo(
    () => adaptLiveStationToContext(selectedStation),
    [selectedStation]
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
          <p className="mt-1 text-xs text-text-secondary sm:text-sm">
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

      {/* Pollutant Breakdown */}
      <PollutantGrid
        pollutants={stationContext.pollutants}
        stationName={`${stationContext.stationName}, ${stationContext.city}`}
      />

      {/* Health Advisory + Quick AI Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <HealthAdvisoryCard
            aqi={stationContext.aqi}
            category={stationContext.category}
            dominantPollutant={dominantPollutant}
          />
        </div>

        <div className="surface-card flex flex-col justify-between border-pink-200 bg-gradient-to-br from-[#FFF5F9] via-white to-[#FAF8F6] p-6 lg:col-span-5">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 bg-white px-3 py-1 text-xs font-bold text-primary-dark">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AIRWATCH AI Summary
            </span>
            <h2 className="font-display text-lg font-bold text-text-primary">
              Want a quick summary of {stationContext.city}?
            </h2>
            <p className="text-xs leading-relaxed text-text-secondary sm:text-sm">
              Ask AIRWATCH AI to explain why{" "}
              <strong className="text-text-primary">{dominantPollutant}</strong> is driving the{" "}
              <strong className="text-primary-dark">{stationContext.category}</strong> reading at{" "}
              <strong className="text-text-primary">{stationContext.stationName}</strong> and what
              precautions matter most today.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() =>
                onAskAI(
                  `Summarize air quality, ${dominantPollutant}, and health advice for ${stationContext.city}.`
                )
              }
              className="btn-primary text-xs sm:text-sm"
            >
              <Sparkles className="h-4 w-4" />
              Ask AIRWATCH AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}