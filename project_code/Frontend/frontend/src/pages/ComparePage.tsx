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
  Good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Satisfactory: "bg-teal-50 text-teal-700 border-teal-200",
  Moderate: "bg-amber-50 text-amber-800 border-amber-200",
  Poor: "bg-orange-50 text-orange-800 border-orange-200",
  "Very Poor": "bg-rose-50 text-rose-700 border-rose-200",
  Severe: "bg-purple-50 text-purple-800 border-purple-200",
};

const DONUT_COLORS: Record<string, string> = {
  "PM2.5": "#db2777", // pink-600
  PM10: "#f97316", // orange-500
  NO2: "#0d9488", // teal-600
  SO2: "#0284c7", // sky-600
  CO: "#eab308", // yellow-500
  O3: "#16a34a", // green-600
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
          <span className="text-xs font-bold uppercase tracking-wider text-primary-dark">
            Spatial &amp; Multi-Pollutant Benchmark
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-text-primary">
            City &amp; Station Comparison
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Compare AQI categories, multi-pollutant radar fingerprints, and hazard shares side-by-side.
          </p>
        </div>

        {onAskAI && (
          <button
            type="button"
            onClick={() =>
              onAskAI(
                `Compare ${ctxA.city} (${ctxA.stationName}, AQI ${ctxA.aqi} - ${ctxA.category}) vs ${ctxB.city} (${ctxB.stationName}, AQI ${ctxB.aqi} - ${ctxB.category}). Explain which city has worse readings and why.`
              )
            }
            className="btn-secondary text-xs"
          >
            <Sparkles className="h-4 w-4 text-primary" /> Ask AI to Compare Both
          </button>
        )}
      </div>

      {/* Dual Station Selector Bar */}
      <div className="surface-card grid grid-cols-1 items-center gap-3 p-4 md:grid-cols-[1fr_auto_1fr]">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary-dark">
            <MapPin className="h-3.5 w-3.5 text-primary" /> Location A
          </label>
          <select
            value={stationA?.station ?? ""}
            onChange={(e) => setStationAName(e.target.value)}
            className="field-input bg-[#FAF8F6]"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-light bg-[#FFF5F9] text-primary-dark transition hover:bg-pink-100"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-teal-700">
            <MapPin className="h-3.5 w-3.5 text-teal-600" /> Location B
          </label>
          <select
            value={stationB?.station ?? ""}
            onChange={(e) => setStationBName(e.target.value)}
            className="field-input bg-[#FAF8F6]"
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
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-pink-200 bg-gradient-to-r from-[#FFF5F9] via-white to-[#FAF8F6] p-5 shadow-2xs sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Scale className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-bold text-text-primary">
                {verdict.worseLabel}
              </h2>
              <span className="rounded-full border border-pink-200 bg-pink-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-dark">
                Comparison Verdict
              </span>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{verdict.summary}</p>
          </div>
        </div>
      </div>

      {/* Side-by-Side Overview Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[
          { ctx: ctxA, side: "A" as const, accent: "border-pink-200" },
          { ctx: ctxB, side: "B" as const, accent: "border-teal-200" },
        ].map(({ ctx, side, accent }) => {
          const isWorse = verdict.worseSide === side;
          return (
            <div
              key={side}
              className={`surface-card space-y-4 p-6 ${
                isWorse ? "border-rose-300 ring-1 ring-rose-200" : accent
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Location {side}
                  </span>
                  <h3 className="font-display text-xl font-bold text-text-primary">
                    {ctx.city}
                  </h3>
                  <p className="text-xs text-text-secondary">{ctx.stationName}</p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    CATEGORY_BADGE[ctx.category]
                  }`}
                >
                  {ctx.category}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-t border-border pt-4">
                <div>
                  <span className="block text-xs text-text-muted">Estimated CPCB AQI</span>
                  <span className="font-display text-3xl font-extrabold text-text-primary">
                    {ctx.aqi}
                  </span>
                </div>

                {verdict.worseSide !== "tie" && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      isWorse
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
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

      {/* 6-Axis Radar Fingerprint + Hazard Share Donut Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 6 Cols: Multi-Pollutant Radar Chart */}
        <div className="surface-card flex flex-col justify-between p-6 lg:col-span-6">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-text-primary">
                <Radar className="h-4 w-4 text-primary" />
                Pollutant Fingerprint (Radar)
              </h3>
              <span className="text-[11px] text-text-muted">Normalized to % of Safe Limit</span>
            </div>
            <p className="mb-4 text-xs text-text-secondary">
              Dashed inner ring = 100% CPCB threshold. Larger polygon area = heavier multi-pollutant load.
            </p>
          </div>

          <PollutantRadarChart ctxA={ctxA} ctxB={ctxB} />

          <div className="mt-4 flex items-center justify-center gap-6 border-t border-border pt-3 text-xs">
            <span className="flex items-center gap-2 font-semibold text-text-primary">
              <span className="h-3 w-3 rounded-sm border border-pink-600 bg-pink-500/35" />
              {ctxA.city} (A)
            </span>
            <span className="flex items-center gap-2 font-semibold text-text-primary">
              <span className="h-3 w-3 rounded-sm border border-teal-600 bg-teal-500/35" />
              {ctxB.city} (B)
            </span>
          </div>
        </div>

        {/* Right 6 Cols: Dual Donut Pie Charts */}
        <div className="surface-card flex flex-col justify-between p-6 lg:col-span-6">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-text-primary">
                <PieChart className="h-4 w-4 text-primary" />
                Pollution Composition (Donut Share)
              </h3>
              <span className="text-[11px] text-text-muted">Weighted by Safe-Limit Ratio</span>
            </div>
            <p className="mb-4 text-xs text-text-secondary">
              Shows which pollutant contributes the largest share of health risk in each city.
            </p>
          </div>

          <div className="my-auto grid grid-cols-1 gap-6 sm:grid-cols-2">
            <HazardDonutCard ctx={ctxA} accentText="text-primary-dark" />
            <HazardDonutCard ctx={ctxB} accentText="text-teal-700" />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px]">
            {CORE_IDS.map((id) => (
              <span key={id} className="flex items-center gap-1.5 font-medium text-text-secondary">
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
      <div className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[#FAF8F6] px-6 py-4">
          <div>
            <h3 className="font-display text-base font-bold text-text-primary">
              Core Pollutant Head-to-Head &amp; 24h Range (Candlestick)
            </h3>
            <p className="text-xs text-text-secondary">
              Thin wick shows 24h min–max fluctuation; bright marker shows current reading.
            </p>
          </div>
        </div>

        <div className="divide-y divide-border">
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
                    <span className="font-bold text-text-primary">{row.id}</span>
                    <span className="text-[11px] text-text-muted">
                      (Safe: {row.safeLimit} {row.unit})
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary">{row.name}</p>
                </div>

                {/* Location A Range Candlestick */}
                <div className="space-y-1.5 md:col-span-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">{ctxA.city}</span>
                    <span
                      className={`font-semibold ${
                        row.higher === "A" ? "text-rose-600" : "text-text-primary"
                      }`}
                    >
                      {row.valA !== null ? `${row.valA} ${row.unit}` : "Not reported"}
                    </span>
                  </div>
                  <div className="relative flex h-3 w-full items-center rounded-full bg-[#F4F1EE]">
                    {row.valA !== null && (
                      <>
                        <div
                          className="absolute h-1 rounded-full bg-pink-400/60"
                          style={{
                            left: `${minPctA}%`,
                            width: `${Math.max(maxPctA - minPctA, 3)}%`,
                          }}
                        />
                        <div
                          className={`absolute h-3 w-2.5 -translate-x-1/2 rounded-xs shadow-2xs ${
                            row.higher === "A" ? "bg-rose-600" : "bg-pink-600"
                          }`}
                          style={{ left: `${pctA}%` }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Location B Range Candlestick */}
                <div className="space-y-1.5 md:col-span-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">{ctxB.city}</span>
                    <span
                      className={`font-semibold ${
                        row.higher === "B" ? "text-rose-600" : "text-text-primary"
                      }`}
                    >
                      {row.valB !== null ? `${row.valB} ${row.unit}` : "Not reported"}
                    </span>
                  </div>
                  <div className="relative flex h-3 w-full items-center rounded-full bg-[#F4F1EE]">
                    {row.valB !== null && (
                      <>
                        <div
                          className="absolute h-1 rounded-full bg-teal-400/60"
                          style={{
                            left: `${minPctB}%`,
                            width: `${Math.max(maxPctB - minPctB, 3)}%`,
                          }}
                        />
                        <div
                          className={`absolute h-3 w-2.5 -translate-x-1/2 rounded-xs shadow-2xs ${
                            row.higher === "B" ? "bg-rose-600" : "bg-teal-600"
                          }`}
                          style={{ left: `${pctB}%` }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Delta Badge */}
                <div className="flex md:col-span-3 md:justify-end">
                  {row.higher === "na" ? (
                    <span className="rounded-lg bg-[#F4F1EE] px-2.5 py-1 text-[11px] text-text-muted">
                      Sensor data incomplete
                    </span>
                  ) : row.higher === "equal" ? (
                    <span className="rounded-lg bg-[#F4F1EE] px-2.5 py-1 text-[11px] text-text-secondary">
                      Equal levels
                    </span>
                  ) : (
                    <span className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
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
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-[280px]">
        {[0.5, 1.0, 1.5, 2.0].map((level) => (
          <circle
            key={level}
            cx={cx}
            cy={cy}
            r={(level / 2.0) * maxRadius}
            fill="none"
            stroke={level === 1.0 ? "#db2777" : "#e5ddd7"}
            strokeWidth={level === 1.0 ? "1.35" : "1"}
            strokeDasharray={level === 1.0 ? "4 3" : undefined}
          />
        ))}

        {CORE_IDS.map((id, idx) => {
          const angle = (Math.PI * 2 * idx) / CORE_IDS.length - Math.PI / 2;
          const x2 = cx + maxRadius * Math.cos(angle);
          const y2 = cy + maxRadius * Math.sin(angle);
          const lx = cx + (maxRadius + 20) * Math.cos(angle);
          const ly = cy + (maxRadius + 20) * Math.sin(angle);

          return (
            <g key={id}>
              <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="#e5ddd7" strokeWidth="1" />
              <text
                x={lx}
                y={ly + 3}
                textAnchor="middle"
                className="fill-zinc-700 text-[10px] font-bold"
              >
                {id}
              </text>
            </g>
          );
        })}

        <polygon
          points={polyA}
          fill="rgba(219, 39, 119, 0.22)"
          stroke="#db2777"
          strokeWidth="2"
        />

        <polygon
          points={polyB}
          fill="rgba(13, 148, 136, 0.22)"
          stroke="#0d9488"
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
    <div className="flex flex-col items-center rounded-xl border border-border bg-[#FAF8F6] p-4">
      <span className={`mb-2 text-xs font-bold ${accentText}`}>{ctx.city}</span>

      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#e8e1dc"
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

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-text-muted">Top Share</span>
          <span className="text-xs font-bold text-text-primary">
            {topSlice ? `${topSlice.id}` : "N/A"}
          </span>
          {topSlice && (
            <span className="text-[10px] font-semibold text-primary-dark">
              {Math.round(topSlice.pct)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};