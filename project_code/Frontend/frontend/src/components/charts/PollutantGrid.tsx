import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type{ PollutantReading } from "../../types/airQuality";

interface PollutantGridProps {
  pollutants: PollutantReading[];
  stationName: string;
}

export const PollutantGrid: React.FC<PollutantGridProps> = ({
  pollutants,
  stationName,
}) => {
  const [showExtended, setShowExtended] = useState(true);

  const visiblePollutants = showExtended
    ? pollutants
    : pollutants.filter((p) => p.isCore !== false);

  const reportedCount = pollutants.filter((p) => p.value !== null).length;

  const dominant = pollutants
    .filter((p) => p.value !== null)
    .sort((a, b) => b.value! / b.safeLimit - a.value! / a.safeLimit)[0];

  const getSeverityAccent = (item: PollutantReading) => {
    if (item.value === null) return "border-l-slate-300 dark:border-l-slate-700";
    const ratio = item.value / item.safeLimit;
    if (ratio > 1.5) return "border-l-rose-500";
    if (ratio > 1.0) return "border-l-orange-500";
    if (ratio > 0.7) return "border-l-amber-400";
    return "border-l-emerald-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-text-primary">
            Major Air Pollutants
          </h3>
          <p className="text-xs text-text-secondary">
            Live sensor readings &amp; 24h micro-trends for{" "}
            <span className="font-semibold text-primary">{stationName}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>
              Sensors: <strong className="text-text-primary">{reportedCount}/{pollutants.length}</strong> active
            </span>
          </div>

          <button
            onClick={() => setShowExtended(!showExtended)}
            className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition hover:bg-surface-dark shadow-2xs"
          >
            {showExtended ? "Core 6 Only" : "+ Extended (NH₃, VOC)"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visiblePollutants.map((item) => {
          const isMissing = item.value === null;
          const isOverLimit = !isMissing && item.value! > item.safeLimit;
          const isDominant = dominant?.id === item.id;
          const ratioPct = !isMissing
            ? Math.min((item.value! / item.safeLimit) * 100, 100)
            : 0;

          return (
            <div
              key={item.id}
              className={`relative rounded-2xl border border-border border-l-4 ${getSeverityAccent(
                item
              )} bg-surface p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md`}
            >
              {/* Floating Exclamation Badge when above safe limit (like AQI.in) */}
              {isOverLimit && (
                <span
                  title={`Exceeds safe limit (${item.safeLimit} ${item.unit})`}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                </span>
              )}

              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-text-primary">
                    {item.id}
                  </span>
                  {isDominant && !isMissing && (
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                      Primary Driver
                    </span>
                  )}
                </div>

                {!isMissing && (
                  <span
                    className={`flex items-center gap-0.5 text-xs font-semibold ${
                      item.trend === "rising"
                        ? "text-rose-500"
                        : item.trend === "falling"
                        ? "text-emerald-500"
                        : "text-text-secondary"
                    }`}
                  >
                    {item.trend === "rising" && <TrendingUp className="h-3.5 w-3.5" />}
                    {item.trend === "falling" && <TrendingDown className="h-3.5 w-3.5" />}
                    {item.trend === "stable" && <Minus className="h-3.5 w-3.5" />}
                    {item.changePercent > 0 ? `+${item.changePercent}%` : `${item.changePercent}%`}
                  </span>
                )}
              </div>

              <p className="text-xs text-text-secondary mb-3">{item.name}</p>

              {isMissing ? (
                <div className="py-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5" /> Not reported by station
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Sensor unavailable at this node.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5 mb-2.5">
                    <span className="text-2xl font-extrabold text-text-primary">
                      {item.value}
                    </span>
                    <span className="text-xs font-medium text-text-secondary">
                      {item.unit}
                    </span>
                    <span className="ml-auto text-[11px] text-text-secondary">
                      Limit: {item.safeLimit}
                    </span>
                  </div>

                  {/* Progress Track */}
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full ${
                        isOverLimit
                          ? "bg-rose-500"
                          : ratioPct > 70
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${ratioPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                    <span className="truncate text-[11px] text-text-secondary">
                      {item.sourceHint}
                    </span>
                    <MiniSparkline data={item.history24h} alert={isOverLimit} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MiniSparkline: React.FC<{ data: number[]; alert: boolean }> = ({
  data,
  alert,
}) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 18;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="shrink-0 overflow-visible">
      <polyline
        fill="none"
        stroke={alert ? "#f43f5e" : "#10b981"}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};