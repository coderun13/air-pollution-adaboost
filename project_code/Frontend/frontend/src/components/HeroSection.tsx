import React from "react";
import { ArrowRight, Sparkles, ShieldAlert, Layers, MapPin } from "lucide-react";
import type { LiveStation } from "../services/api";
import { adaptLiveStationToContext } from "../utils/stationAdapter";

interface HeroSectionProps {
  featuredStation?: LiveStation;
  totalStationsCount: number;
  liveApi: boolean;
}

const CPCB_BANDS = [
  { label: "Good", range: "0–50", dotClass: "bg-emerald-500" },
  { label: "Satisfactory", range: "51–100", dotClass: "bg-teal-500" },
  { label: "Moderate", range: "101–200", dotClass: "bg-amber-500" },
  { label: "Poor", range: "201–300", dotClass: "bg-orange-500" },
  { label: "Very Poor", range: "301–400", dotClass: "bg-rose-600" },
  { label: "Severe", range: "401+", dotClass: "bg-purple-600" },
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredStation,
  totalStationsCount,
  liveApi,
}) => {
  const ctx = featuredStation ? adaptLiveStationToContext(featuredStation) : null;

  const pm25 = featuredStation?.["PM2.5_avg"] ?? 92.6;
  const pm10 = featuredStation?.PM10_avg ?? 176.0;
  const no2 = featuredStation?.NO2_avg ?? 49.8;
  const co = featuredStation?.CO_normalized ?? featuredStation?.CO_avg ?? 1.18;
  const predictedCategory =
    featuredStation?.ml_predicted_category || ctx?.category || "Moderate";

  return (
    <section
      id="hero"
      className="relative overflow-hidden border-b border-border bg-gradient-to-br from-[#FFF5F9] via-[#FAF8F6] to-[#F3FBF9]"
    >
      {/* Soft Bright Pastel Accents */}
      <div className="pointer-events-none absolute -top-24 -right-20 h-96 w-96 rounded-full bg-pink-200/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-10 h-72 w-72 rounded-full bg-rose-100/70 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
          {/* Left Column: All-India Value Proposition & CTAs */}
          <div className="lg:col-span-7">

            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
              All-India Air Quality Intelligence &{" "}
              <span className="bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                ML Classification
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
              Explore air quality readings across Indian monitoring stations, simulate custom
              7-pollutant scenarios.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <a href="#ml-predictor" className="btn-primary">
                Launch ML Predictor
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="#live-stations" className="btn-secondary">
                Browse Live Stations
              </a>
              {/* <a
                href="#model-insights"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-surface-dark"
              >
                View Model Benchmarks
              </a> */}
            </div>

            {/* Key Platform Metrics */}
            <div className="mt-9 grid grid-cols-3 gap-4 border-t border-border pt-6 sm:max-w-xl">
              <div className="rounded-xl border border-border/80 bg-white/80 p-3">
                <div className="font-display text-2xl font-extrabold text-text-primary">
                  36,530
                </div>
                <div className="text-xs text-text-secondary">Historical Records</div>
              </div>
              <div className="rounded-xl border border-pink-200 bg-pink-50/70 p-3">
                <div className="font-display text-2xl font-extrabold text-primary-dark">
                  0.9072
                </div>
                <div className="text-xs text-text-secondary">AdaBoost Macro-F1</div>
              </div>
              <div className="rounded-xl border border-border/80 bg-white/80 p-3">
                <div className="font-display text-2xl font-extrabold text-text-primary">
                  {totalStationsCount}
                </div>
                <div className="text-xs text-text-secondary">
                  {liveApi ? "Live Stations Loaded" : "Stations in Snapshot"}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Featured Station Snapshot Card */}
          <div className="lg:col-span-5">
            <div className="surface-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary-dark">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Featured Station Snapshot
                  </span>
                  <h2 className="mt-1 font-display text-lg font-bold text-text-primary">
                    {ctx?.stationName ||
                      featuredStation?.station ||
                      "Rabindra Bharati University, Kolkata"}
                  </h2>
                  <p className="text-xs text-text-secondary">
                    {ctx?.city || featuredStation?.city || "Kolkata"}
                    {featuredStation?.state ? `, ${featuredStation.state}` : ", India"}
                  </p>
                </div>

                <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-bold text-primary-dark">
                  {predictedCategory}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
                  <div className="text-[11px] font-medium text-text-muted">PM2.5</div>
                  <div className="mt-1 font-display text-base font-extrabold text-text-primary">
                    {pm25}
                  </div>
                  <div className="text-[10px] text-text-secondary">µg/m³</div>
                </div>
                <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
                  <div className="text-[11px] font-medium text-text-muted">PM10</div>
                  <div className="mt-1 font-display text-base font-extrabold text-text-primary">
                    {pm10}
                  </div>
                  <div className="text-[10px] text-text-secondary">µg/m³</div>
                </div>
                <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
                  <div className="text-[11px] font-medium text-text-muted">NO2</div>
                  <div className="mt-1 font-display text-base font-extrabold text-text-primary">
                    {no2}
                  </div>
                  <div className="text-[10px] text-text-secondary">µg/m³</div>
                </div>
                <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
                  <div className="text-[11px] font-medium text-text-muted">CO (Norm)</div>
                  <div className="mt-1 font-display text-base font-extrabold text-text-primary">
                    {co}
                  </div>
                  <div className="text-[10px] text-text-secondary">mg/m³</div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-text-secondary">
                <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  7 CPCB input features
                </span>
                <span className="inline-flex items-center gap-1 text-text-muted">
                  <ShieldAlert className="h-3.5 w-3.5 text-pink-500" />
                  Analytical ML output
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CPCB Reference Strip */}
        <div
          id="aqi-scale"
          className="mt-12 scroll-mt-24 rounded-2xl border border-border bg-white/90 p-4 shadow-2xs"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              CPCB AQI Category Reference
            </span>
            <div className="flex flex-wrap gap-2">
              {CPCB_BANDS.map((band) => (
                <div
                  key={band.label}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-[#FAF8F6] px-2.5 py-1 text-xs"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${band.dotClass}`} />
                  <span className="font-semibold text-text-primary">{band.label}</span>
                  <span className="text-text-muted">({band.range})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};