import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  SlidersHorizontal,
  Wind,
  Layers,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import type { LiveStation } from "../services/api";

interface MapPageProps {
  stations: LiveStation[];
  liveApi: boolean;
  onSelectForPrediction: (station: LiveStation) => void;
}

const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Delhi: { lat: 28.6139, lon: 77.209 },
  "New Delhi": { lat: 28.6139, lon: 77.209 },
  Mumbai: { lat: 19.076, lon: 72.8777 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
  Bengaluru: { lat: 12.9716, lon: 77.5946 },
  Bangalore: { lat: 12.9716, lon: 77.5946 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Hyderabad: { lat: 17.385, lon: 78.4867 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Ahmedabad: { lat: 23.0225, lon: 72.5714 },
  Jaipur: { lat: 26.9124, lon: 75.7873 },
  Lucknow: { lat: 26.8467, lon: 80.9462 },
  Patna: { lat: 25.5941, lon: 85.1376 },
  Asansol: { lat: 23.6889, lon: 86.9661 },
  Durgapur: { lat: 23.5204, lon: 87.3119 },
  Siliguri: { lat: 26.7271, lon: 88.3953 },
  Bhubaneswar: { lat: 20.2961, lon: 85.8245 },
  Guwahati: { lat: 26.1445, lon: 91.7362 },
  Chandigarh: { lat: 30.7333, lon: 76.7794 },
  Nagpur: { lat: 21.1458, lon: 79.0882 },
};

const INDIA_BOUNDS = {
  minLat: 7.5,
  maxLat: 36.5,
  minLon: 68.0,
  maxLon: 97.5,
};

function getStationCoords(station: LiveStation, index: number) {
  const rawLat = Number(station.lat ?? station.latitude);
  const rawLon = Number(station.lon ?? station.longitude);

  let lat = Number.isFinite(rawLat) && rawLat !== 0 ? rawLat : NaN;
  let lon = Number.isFinite(rawLon) && rawLon !== 0 ? rawLon : NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const cityKey = Object.keys(CITY_COORDS).find(
      (k) => k.toLowerCase() === String(station.city || "").trim().toLowerCase()
    );
    if (cityKey) {
      lat = CITY_COORDS[cityKey].lat;
      lon = CITY_COORDS[cityKey].lon;
    } else {
      const angle = (index * 137.5 * Math.PI) / 180;
      const radius = 3.5 + (index % 6) * 1.4;
      lat = 22.0 + Math.sin(angle) * radius;
      lon = 79.5 + Math.cos(angle) * radius;
    }
  }

  const jitterLat = ((index % 5) - 2) * 0.22;
  const jitterLon = (((index + 2) % 5) - 2) * 0.25;

  const finalLat = lat + jitterLat;
  const finalLon = lon + jitterLon;

  const xRaw =
    ((finalLon - INDIA_BOUNDS.minLon) /
      (INDIA_BOUNDS.maxLon - INDIA_BOUNDS.minLon)) *
    100;
  const yRaw =
    (1 -
      (finalLat - INDIA_BOUNDS.minLat) /
        (INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat)) *
    100;

  return {
    lat: Number(finalLat.toFixed(2)),
    lon: Number(finalLon.toFixed(2)),
    xPct: Math.min(88, Math.max(12, Number(xRaw.toFixed(1)))),
    yPct: Math.min(88, Math.max(12, Number(yRaw.toFixed(1)))),
  };
}

function getMarkerStyle(category?: string | null) {
  switch (category) {
    case "Good":
      return {
        dot: "bg-emerald-500 ring-emerald-400/40",
        halo: "bg-emerald-400/25",
      };
    case "Satisfactory":
      return {
        dot: "bg-lime-500 ring-lime-400/40",
        halo: "bg-lime-400/25",
      };
    case "Moderate":
      return {
        dot: "bg-amber-400 ring-amber-400/40",
        halo: "bg-amber-400/30",
      };
    case "Poor":
      return {
        dot: "bg-orange-500 ring-orange-400/40",
        halo: "bg-orange-500/30",
      };
    case "Very Poor":
      return {
        dot: "bg-rose-500 ring-rose-400/45",
        halo: "bg-rose-500/35",
      };
    case "Severe":
      return {
        dot: "bg-purple-600 ring-purple-400/45",
        halo: "bg-purple-500/35",
      };
    default:
      return {
        dot: "bg-blue-500 ring-blue-400/40",
        halo: "bg-blue-400/25",
      };
  }
}

export function MapPage({
  stations,
  liveApi,
  onSelectForPrediction,
}: MapPageProps) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const plottedStations = useMemo(() => {
    return stations.map((st, idx) => ({
      station: st,
      index: idx,
      coords: getStationCoords(st, idx),
    }));
  }, [stations]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((s) => {
      if (s.ml_predicted_category) {
        set.add(String(s.ml_predicted_category));
      }
    });
    return ["All", ...Array.from(set)];
  }, [stations]);

  const visibleStations = useMemo(() => {
    if (selectedCategory === "All") return plottedStations;
    return plottedStations.filter(
      (item) => (item.station.ml_predicted_category || "Moderate") === selectedCategory
    );
  }, [plottedStations, selectedCategory]);

  const activeItem =
    visibleStations.find((item) => item.index === selectedIndex) ||
    visibleStations[0] ||
    plottedStations[0];

  const handleSimulate = (station: LiveStation) => {
    onSelectForPrediction(station);
    navigate("/predict");
  };

  const handleInspectAnalytics = (station: LiveStation) => {
    onSelectForPrediction(station);
    navigate("/analytics");
  };

  return (
    <div className="bg-background text-text-primary">
      {/* Header Banner (Light & Dark Adaptive) */}
      <section className="border-b border-border bg-gradient-to-r from-sky-50 via-surface to-emerald-50/60 dark:from-slate-900 dark:via-background dark:to-indigo-950/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Layers className="h-3.5 w-3.5" />
              <span>All-India Geospatial Intelligence</span>
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Interactive <span className="text-primary">India Air Quality Map</span>
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
              Click any regional monitoring node to inspect pollution hotspots, live particulate
              loads, and launch ML simulations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                liveApi
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              {liveApi ? "Live FastAPI Telemetry" : "Snapshot Telemetry"}
            </span>

            <select
              aria-label="Filter map markers by AQI category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-medium text-text-primary shadow-2xs focus:border-primary focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All AQI Categories" : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Interactive Map + Inspector Grid */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Geographic India Map Stage */}
          <div className="relative rounded-2xl border border-border bg-surface p-4 shadow-xs lg:col-span-8">
            <div className="mb-3 flex items-center justify-between text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary">
                <MapPin className="h-4 w-4 text-primary" />
                India Monitoring Network ({visibleStations.length} active nodes)
              </span>
              <span>Click a hotspot pin to inspect</span>
            </div>

            {/* Bright Oceanic-Slate Map Canvas in Light Mode / Deep Radar in Dark Mode */}
            <div className="relative h-[460px] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-sky-100/80 via-blue-50/70 to-indigo-100/70 dark:from-[#09111e] dark:via-[#0b1526] dark:to-[#080d17]">
              {/* India Mainland Landmass Silhouette SVG */}
              <svg
                viewBox="0 0 500 540"
                preserveAspectRatio="xMidYMid meet"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <defs>
                  <linearGradient id="indiaLand" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
                  </linearGradient>
                </defs>

                {/* Stylized Geographic Polygon of India */}
                <path
                  d="M 185 28 L 222 36 L 236 66 L 224 94 L 254 118 L 296 144 L 348 158 L 385 144 L 428 136 L 444 162 L 418 192 L 404 226 L 386 212 L 368 184 L 336 188 L 344 226 L 316 258 L 278 292 L 244 338 L 224 394 L 204 456 L 186 496 L 172 454 L 154 392 L 138 326 L 126 264 L 88 238 L 76 206 L 106 188 L 126 154 L 158 118 L 166 72 Z"
                  fill="url(#indiaLand)"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-blue-600/45 dark:text-sky-400/35"
                />

                {/* Subtle Wind Flow Arcs */}
                <path
                  d="M 60 180 Q 210 140 390 190"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeDasharray="5 5"
                  className="text-blue-500/25 dark:text-sky-400/20"
                />
                <path
                  d="M 90 310 Q 220 270 350 320"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeDasharray="5 5"
                  className="text-emerald-600/25 dark:text-emerald-400/20"
                />
              </svg>

              {/* Station Heatmap Halos + Interactive Pins */}
              {visibleStations.map(({ station, index, coords }) => {
                const isSelected = activeItem?.index === index;
                const style = getMarkerStyle(station.ml_predicted_category);

                return (
                  <button
                    key={`${station.station || "st"}-${index}`}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    style={{ left: `${coords.xPct}%`, top: `${coords.yPct}%` }}
                    title={`${station.station || "Station"} (${station.city || "India"})`}
                    className={`group absolute -translate-x-1/2 -translate-y-1/2 transition-transform focus:outline-none ${
                      isSelected ? "z-30 scale-115" : "z-10 hover:scale-110"
                    }`}
                  >
                    {/* Soft Heatmap Glow Halo */}
                    <span
                      className={`pointer-events-none absolute -inset-4 rounded-full blur-md ${style.halo}`}
                    />

                    {/* Pin Dot */}
                    <span
                      className={`relative block h-4 w-4 rounded-full ring-4 ${style.dot} ${
                        isSelected ? "ring-slate-900/30 dark:ring-white/50" : ""
                      }`}
                    />

                    {/* City Label Pill */}
                    <span
                      className={`relative mt-1 block whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-semibold shadow-xs ${
                        isSelected
                          ? "border border-primary bg-primary text-white"
                          : "border border-border bg-surface/95 text-text-primary group-hover:border-primary/50"
                      }`}
                    >
                      {station.city || `Node ${index + 1}`}
                    </span>
                  </button>
                );
              })}

              {/* Legend Overlay */}
              <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/90 px-3 py-1.5 text-[10px] font-medium text-text-secondary backdrop-blur-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Good/Sat.
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-orange-500" /> Poor
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Very Poor
                </span>
              </div>
            </div>
          </div>

          {/* Selected Station Inspector Card */}
          <div className="lg:col-span-4">
            {activeItem ? (
              <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Selected Station
                      </span>
                      <h2 className="mt-1 font-display text-xl font-bold text-text-primary">
                        {activeItem.station.station || "CPCB Monitoring Station"}
                      </h2>
                      <p className="text-xs text-text-secondary">
                        {activeItem.station.city || "India"}
                        {activeItem.station.state
                          ? `, ${activeItem.station.state}`
                          : ""}{" "}
                        · ({activeItem.coords.lat}°N, {activeItem.coords.lon}°E)
                      </p>
                    </div>

                    <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {activeItem.station.ml_predicted_category || "Moderate"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-border bg-surface-dark p-3">
                      <div className="text-text-secondary">PM2.5</div>
                      <div className="mt-1 font-display text-lg font-bold text-text-primary">
                        {activeItem.station["PM2.5_avg"] ?? "—"}{" "}
                        <span className="text-xs font-normal text-text-secondary">
                          µg/m³
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-dark p-3">
                      <div className="text-text-secondary">PM10</div>
                      <div className="mt-1 font-display text-lg font-bold text-text-primary">
                        {activeItem.station.PM10_avg ?? "—"}{" "}
                        <span className="text-xs font-normal text-text-secondary">
                          µg/m³
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-dark p-3">
                      <div className="text-text-secondary">NO₂</div>
                      <div className="mt-1 font-display text-lg font-bold text-text-primary">
                        {activeItem.station.NO2_avg ?? "—"}{" "}
                        <span className="text-xs font-normal text-text-secondary">
                          µg/m³
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-dark p-3">
                      <div className="text-text-secondary">SO₂</div>
                      <div className="mt-1 font-display text-lg font-bold text-text-primary">
                        {activeItem.station.SO2_avg ?? "—"}{" "}
                        <span className="text-xs font-normal text-text-secondary">
                          µg/m³
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-dark p-3">
                      <div className="text-text-secondary">CO (Norm.)</div>
                      <div className="mt-1 font-display text-lg font-bold text-text-primary">
                        {activeItem.station.CO_normalized ??
                          activeItem.station.CO_avg ??
                          "—"}{" "}
                        <span className="text-xs font-normal text-text-secondary">
                          mg/m³
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-surface-dark p-3">
                      <div className="text-text-secondary">O₃ / NH₃</div>
                      <div className="mt-1 font-display text-sm font-bold text-text-primary">
                        {activeItem.station.OZONE_avg ?? "—"} /{" "}
                        {activeItem.station.NH3_avg ?? "—"}
                      </div>
                    </div>
                  </div>

                  {typeof activeItem.station.ml_confidence === "number" && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface-dark px-3 py-2 text-xs text-text-secondary">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>
                        AdaBoost Confidence:{" "}
                        <strong className="text-text-primary">
                          {(activeItem.station.ml_confidence * 100).toFixed(1)}%
                        </strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => handleInspectAnalytics(activeItem.station)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-dark px-4 py-2.5 text-xs font-semibold text-text-primary transition hover:border-primary"
                  >
                    <BarChart3 className="h-4 w-4 text-primary" />
                    View Full Pollutant &amp; Health Analytics
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulate(activeItem.station)}
                    className="btn-primary w-full text-xs"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Load into ML Predictor
                  </button>

                  <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-text-secondary">
                    <Wind className="h-3.5 w-3.5 text-primary" />
                    <span>7-pollutant CPCB feature pipeline</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-text-secondary">
                No stations available for this filter.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}