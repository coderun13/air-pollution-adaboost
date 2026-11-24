import React, { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Sparkles,
  Scale,
  Radar,
  PieChart,
} from "lucide-react";
import type { LiveStation } from "../services/api";
import { adaptLiveStationToContext } from "../utils/stationAdapter";
import type { AQICategory, StationContext } from "../types/airQuality";

interface ComparePageProps {
  stations: LiveStation[];
  onAskAI?: (prompt: string) => void;
}

const CORE_IDS = ["PM2.5", "PM10", "NO2", "SO2", "CO", "O3"] as const;

const CATEGORY_BADGE: Record<AQICategory, string> = {
  Good: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Satisfactory: "bg-lime-500/15 text-lime-300 border-lime-500/30",
  Moderate: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Poor: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  "Very Poor": "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Severe: "bg-red-600/20 text-red-300 border-red-500/40",
};

const DONUT_COLORS: Record<string, string> = {
  "PM2.5": "#f43f5e", // rose
  PM10: "#fb923c", // orange
  NO2: "#818cf8", // indigo
  SO2: "#38bdf8", // sky
  CO: "#facc15", // yellow
  O3: "#34d399", // emerald
};

export const ComparePage: React.FC<ComparePageProps> = ({ stations, onAskAI }) => {
  const [stationAName, setStationAName] = useState<string>(
    stations[0]?.station ?? ""
  );
  const [stationBName, setStationBName] = useState<string>(
    stations[1]?.station ?? stations[0]?.station ?? ""
  );

  const stationA = useMemo(
    () => stations.find((s) => s.station === stationAName) ?? stations[0],
    [stations, stationAName]
  );

  const stationB = useMemo(
    () =>
      stations.find((s) => s.station === stationBName) ??
      stations[1] ??
      stations[0],
    [stations, stationBName]
  );

  const ctxA = useMemo(() => adaptLiveStationToContext(stationA), [stationA]);
  const ctxB = useMemo(() => adaptLiveStationToContext(stationB), [stationB]);

  const handleSwap = () => {
    setStationAName(stationBName);
    setStationBName(stationAName);
  };

  const verdict = useMemo(() => {
    const diff = Math.abs(ctxA.aqi - ctxB.aqi);
    if (ctxA.aqi === ctxB.aqi) {
      return {
        worseLabel: "Equal Pollution Load",
        summary: `${ctxA.city} and ${ctxB.city} are currently tied at an estimated AQI of ${ctxA.aqi} (${ctxA.category}).`,
        worseSide: "tie" as const,
      };
    }
    const aIsWorse = ctxA.aqi > ctxB.aqi;
    const worse = aIsWorse ? ctxA : ctxB;
    const cleaner = aIsWorse ? ctxB : ctxA;
    const pctHigher =
      cleaner.aqi > 0 ? Math.round((diff / cleaner.aqi) * 100) : 0;

    return {
      worseLabel: `${worse.city} has worse air quality`,
      summary: `${worse.city} (${worse.category}, Est. AQI ${worse.aqi}) is ${diff} AQI points (+${pctHigher}%) higher than ${cleaner.city} (${cleaner.category}, Est. AQI ${cleaner.aqi}).`,
      worseSide: aIsWorse ? ("A" as const) : ("B" as const),
    };
  }, [ctxA, ctxB]);

  const rows = useMemo(() => {
    return CORE_IDS.map((id) => {
      const pA = ctxA.pollutants.find((p) => p.id === id);
      const pB = ctxB.pollutants.find((p) => p.id === id);
      const valA = pA?.value ?? null;
      const valB = pB?.value ?? null;

      let higher: "A" | "B" | "equal" | "na" = "na";
      if (valA !== null && valB !== null) {
        if (valA > valB) higher = "A";
        else if (valB > valA) higher = "B";
        else higher = "equal";
      }

      // Compute 24h min/max range (candle wick bounds) from history24h
      const histA = pA?.history24h?.length ? pA.history24h : valA !== null ? [valA] : [];
      const histB = pB?.history24h?.length ? pB.history24h : valB !== null ? [valB] : [];

      return {
        id,
        name: pA?.name ?? id,
        unit: pA?.unit ?? "µg/m³",
        safeLimit: pA?.safeLimit ?? 100,
        valA,
        valB,
        minA: histA.length ? Math.min(...histA) : null,
        maxA: histA.length ? Math.max(...histA) : null,
        minB: histB.length ? Math.min(...histB) : null,
        maxB: histB.length ? Math.max(...histB) : null,
        higher,
      };
    });
  }, [ctxA, ctxB]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Spatial &amp; Multi-Pollutant Benchmark
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">
            City &amp; Station Comparison
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Compare AQI categories, multi-pollutant radar fingerprints, and hazard shares side-by-side.
          </p>
        </div>

        {onAskAI && (
          <button
            onClick={() =>
              onAskAI(
                `Compare ${ctxA.city} (${ctxA.stationName}, AQI ${ctxA.aqi} - ${ctxA.category}) vs ${ctxB.city} (${ctxB.stationName}, AQI ${ctxB.aqi} - ${ctxB.category}). Explain which city has worse readings and why.`
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/25"
          >
            <Sparkles className="h-4 w-4" /> Ask AI to Compare Both
          </button>
        )}
      </div>

      {/* Dual Station Selector Bar */}
      <div className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-[1fr_auto_1fr]">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-indigo-300">
            <MapPin className="h-3.5 w-3.5" /> Location A
          </label>
          <select
            value={stationA?.station ?? ""}
            onChange={(e) => setStationAName(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
          >
            {stations.map((st, i) => (
              <option key={`a-${st.station}-${i}`} value={st.station ?? ""}>
                {st.city} — {st.station}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-center pt-2 md:pt-5">
          <button
            type="button"
            onClick={handleSwap}
            title="Swap stations"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-indigo-500 hover:text-white"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <MapPin className="h-3.5 w-3.5" /> Location B
          </label>
          <select
            value={stationB?.station ?? ""}
            onChange={(e) => setStationBName(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            {stations.map((st, i) => (
              <option key={`b-${st.station}-${i}`} value={st.station ?? ""}>
                {st.city} — {st.station}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Verdict Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Scale className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{verdict.worseLabel}</h2>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                Comparison Verdict
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-300">{verdict.summary}</p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Overview Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[
          { ctx: ctxA, side: "A" as const, accent: "border-indigo-500/40" },
          { ctx: ctxB, side: "B" as const, accent: "border-emerald-500/40" },
        ].map(({ ctx, side, accent }) => {
          const isWorse = verdict.worseSide === side;
          return (
            <div
              key={side}
              className={`rounded-2xl border ${
                isWorse ? "border-rose-500/50" : accent
              } bg-slate-900/75 p-6 space-y-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Location {side}
                  </span>
                  <h3 className="text-xl font-bold text-white">{ctx.city}</h3>
                  <p className="text-xs text-slate-400">{ctx.stationName}</p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    CATEGORY_BADGE[ctx.category]
                  }`}
                >
                  {ctx.category}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-t border-slate-800 pt-4">
                <div>
                  <span className="text-xs text-slate-400 block">Estimated CPCB AQI</span>
                  <span className="text-3xl font-extrabold text-white">{ctx.aqi}</span>
                </div>

                {verdict.worseSide !== "tie" && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${
                      isWorse
                        ? "bg-rose-500/15 text-rose-300"
                        : "bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    {isWorse ? (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5" /> Worse Air Quality
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Cleaner Location
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW VISUAL GRAPHS: 6-Axis Radar Fingerprint + Hazard Share Donut Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 6 Cols: Multi-Pollutant Radar Chart */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Radar className="h-4 w-4 text-indigo-400" />
                Pollutant Fingerprint (Radar)
              </h3>
              <span className="text-[11px] text-slate-400">Normalized to % of Safe Limit</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Dashed inner ring = 100% CPCB threshold. Larger polygon area = heavier multi-pollutant load.
            </p>
          </div>

          <PollutantRadarChart ctxA={ctxA} ctxB={ctxB} />

          <div className="mt-4 flex items-center justify-center gap-6 text-xs pt-3 border-t border-slate-800">
            <span className="flex items-center gap-2 text-slate-200 font-medium">
              <span className="h-3 w-3 rounded-sm bg-indigo-500/50 border border-indigo-400" />
              {ctxA.city} (A)
            </span>
            <span className="flex items-center gap-2 text-slate-200 font-medium">
              <span className="h-3 w-3 rounded-sm bg-emerald-500/50 border border-emerald-400" />
              {ctxB.city} (B)
            </span>
          </div>
        </div>

        {/* Right 6 Cols: Dual Donut Pie Charts (Hazard Contribution Share) */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <PieChart className="h-4 w-4 text-rose-400" />
                Pollution Composition (Donut Share)
              </h3>
              <span className="text-[11px] text-slate-400">Weighted by Safe-Limit Ratio</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Shows which pollutant contributes the largest share of health risk in each city.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-auto">
            <HazardDonutCard ctx={ctxA} accentText="text-indigo-300" />
            <HazardDonutCard ctx={ctxB} accentText="text-emerald-300" />
          </div>

          {/* Shared Color Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] pt-3 border-t border-slate-800">
            {CORE_IDS.map((id) => (
              <span key={id} className="flex items-center gap-1.5 text-slate-300">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: DONUT_COLORS[id] }}
                />
                {id}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Head-to-Head Table with 24h Range Candlestick Bars */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
        <div className="border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white">
              Core Pollutant Head-to-Head &amp; 24h Range (Candlestick)
            </h3>
            <p className="text-xs text-slate-400">
              Thin wick shows 24h min–max fluctuation; bright marker shows current reading.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {rows.map((row) => {
            const maxVal = Math.max(
              row.maxA ?? row.valA ?? 0,
              row.maxB ?? row.valB ?? 0,
              row.safeLimit
            );
            const pctA = row.valA !== null ? Math.min((row.valA / maxVal) * 100, 100) : 0;
            const minPctA = row.minA !== null ? Math.min((row.minA / maxVal) * 100, 100) : pctA;
            const maxPctA = row.maxA !== null ? Math.min((row.maxA / maxVal) * 100, 100) : pctA;

            const pctB = row.valB !== null ? Math.min((row.valB / maxVal) * 100, 100) : 0;
            const minPctB = row.minB !== null ? Math.min((row.minB / maxVal) * 100, 100) : pctB;
            const maxPctB = row.maxB !== null ? Math.min((row.maxB / maxVal) * 100, 100) : pctB;

            return (
              <div
                key={row.id}
                className="grid grid-cols-1 items-center gap-4 px-6 py-4 md:grid-cols-12"
              >
                {/* Pollutant Label */}
                <div className="md:col-span-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{row.id}</span>
                    <span className="text-[11px] text-slate-500">
                      (Safe: {row.safeLimit} {row.unit})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{row.name}</p>
                </div>

                {/* Location A Range Candlestick */}
                <div className="md:col-span-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{ctxA.city}</span>
                    <span
                      className={`font-semibold ${
                        row.higher === "A" ? "text-rose-400" : "text-slate-200"
                      }`}
                    >
                      {row.valA !== null ? `${row.valA} ${row.unit}` : "Not reported"}
                    </span>
                  </div>
                  <div className="relative h-3 w-full rounded-full bg-slate-800/90 flex items-center">
                    {row.valA !== null && (
                      <>
                        {/* 24h Min-Max Wick */}
                        <div
                          className="absolute h-1 rounded-full bg-indigo-400/50"
                          style={{
                            left: `${minPctA}%`,
                            width: `${Math.max(maxPctA - minPctA, 3)}%`,
                          }}
                        />
                        {/* Current Candle Marker */}
                        <div
                          className={`absolute h-3 w-2.5 -translate-x-1/2 rounded-xs shadow ${
                            row.higher === "A" ? "bg-rose-500" : "bg-indigo-400"
                          }`}
                          style={{ left: `${pctA}%` }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Location B Range Candlestick */}
                <div className="md:col-span-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{ctxB.city}</span>
                    <span
                      className={`font-semibold ${
                        row.higher === "B" ? "text-rose-400" : "text-slate-200"
                      }`}
                    >
                      {row.valB !== null ? `${row.valB} ${row.unit}` : "Not reported"}
                    </span>
                  </div>
                  <div className="relative h-3 w-full rounded-full bg-slate-800/90 flex items-center">
                    {row.valB !== null && (
                      <>
                        <div
                          className="absolute h-1 rounded-full bg-emerald-400/50"
                          style={{
                            left: `${minPctB}%`,
                            width: `${Math.max(maxPctB - minPctB, 3)}%`,
                          }}
                        />
                        <div
                          className={`absolute h-3 w-2.5 -translate-x-1/2 rounded-xs shadow ${
                            row.higher === "B" ? "bg-rose-500" : "bg-emerald-400"
                          }`}
                          style={{ left: `${pctB}%` }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Delta Badge */}
                <div className="md:col-span-3 flex md:justify-end">
                  {row.higher === "na" ? (
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-slate-400">
                      Sensor data incomplete
                    </span>
                  ) : row.higher === "equal" ? (
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">
                      Equal levels
                    </span>
                  ) : (
                    <span className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-300">
                      Higher in {row.higher === "A" ? ctxA.city : ctxB.city} (+
                      {Math.abs((row.valA ?? 0) - (row.valB ?? 0)).toFixed(1)})
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------------- Custom SVG Radar Chart ---------------- */

const PollutantRadarChart: React.FC<{
  ctxA: StationContext;
  ctxB: StationContext;
}> = ({ ctxA, ctxB }) => {
  const size = 270;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = 92;

  const getRatios = (ctx: StationContext) =>
    CORE_IDS.map((id) => {
      const p = ctx.pollutants.find((item) => item.id === id);
      if (!p || p.value === null) return 0;
      // Cap at 200% of safe limit so extreme spikes don't clip outside SVG
      return Math.min(p.value / p.safeLimit, 2.0);
    });

  const ratiosA = getRatios(ctxA);
  const ratiosB = getRatios(ctxB);

  const toPoint = (index: number, ratio: number) => {
    const angle = (Math.PI * 2 * index) / CORE_IDS.length - Math.PI / 2;
    const r = (ratio / 2.0) * maxRadius;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  };

  const polyA = ratiosA.map((r, i) => toPoint(i, r)).join(" ");
  const polyB = ratiosB.map((r, i) => toPoint(i, r)).join(" ");

  return (
    <div className="flex justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] h-auto">
        {/* Concentric rings: 50%, 100% (Safe Limit), 150%, 200% */}
        {[0.5, 1.0, 1.5, 2.0].map((level) => (
          <circle
            key={level}
            cx={cx}
            cy={cy}
            r={(level / 2.0) * maxRadius}
            fill="none"
            stroke={level === 1.0 ? "#f59e0b" : "#1e293b"}
            strokeWidth={level === 1.0 ? "1.25" : "1"}
            strokeDasharray={level === 1.0 ? "4 3" : undefined}
          />
        ))}

        {/* Spokes & Axis Labels */}
        {CORE_IDS.map((id, idx) => {
          const angle = (Math.PI * 2 * idx) / CORE_IDS.length - Math.PI / 2;
          const x2 = cx + maxRadius * Math.cos(angle);
          const y2 = cy + maxRadius * Math.sin(angle);
          const lx = cx + (maxRadius + 20) * Math.cos(angle);
          const ly = cy + (maxRadius + 20) * Math.sin(angle);

          return (
            <g key={id}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#1e293b" strokeWidth="1" />
              <text
                x={lx}
                y={ly + 3}
                textAnchor="middle"
                className="fill-slate-300 text-[10px] font-semibold"
              >
                {id}
              </text>
            </g>
          );
        })}

        {/* Location A Polygon */}
        <polygon
          points={polyA}
          fill="rgba(99, 102, 241, 0.28)"
          stroke="#818cf8"
          strokeWidth="2"
        />

        {/* Location B Polygon */}
        <polygon
          points={polyB}
          fill="rgba(16, 185, 129, 0.25)"
          stroke="#34d399"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

/* ---------------- Custom SVG Donut (Pie) Chart ---------------- */

const HazardDonutCard: React.FC<{
  ctx: StationContext;
  accentText: string;
}> = ({ ctx, accentText }) => {
  const slices = useMemo(() => {
    const items = CORE_IDS.map((id) => {
      const p = ctx.pollutants.find((x) => x.id === id);
      const score = p && p.value !== null ? p.value / p.safeLimit : 0;
      return { id, score, color: DONUT_COLORS[id] };
    }).filter((x) => x.score > 0);

    const total = items.reduce((sum, x) => sum + x.score, 0) || 1;
    let cumulative = 0;

    return items.map((item) => {
      const pct = (item.score / total) * 100;
      const start = cumulative;
      cumulative += pct;
      return { ...item, pct, start };
    });
  }, [ctx]);

  const topSlice = [...slices].sort((a, b) => b.pct - a.pct)[0];
  const radius = 36;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
      <span className={`text-xs font-semibold mb-2 ${accentText}`}>{ctx.city}</span>

      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth="14"
          />
          {slices.map((slice) => {
            const dash = (slice.pct / 100) * circumference;
            const offset = -((slice.start / 100) * circumference);
            return (
              <circle
                key={slice.id}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth="14"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>

        {/* Center Top Driver Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-400">Top Share</span>
          <span className="text-xs font-bold text-white">
            {topSlice ? `${topSlice.id}` : "N/A"}
          </span>
          {topSlice && (
            <span className="text-[10px] text-slate-400">
              {Math.round(topSlice.pct)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};