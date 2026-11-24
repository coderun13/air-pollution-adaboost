import React from "react";

interface AqiSpectrumBarProps {
  aqi: number;
  category: string;
}

const BANDS = [
  { label: "Good", min: 0, max: 50, color: "bg-emerald-500" },
  { label: "Satisfactory", min: 51, max: 100, color: "bg-lime-500" },
  { label: "Moderate", min: 101, max: 200, color: "bg-amber-400" },
  { label: "Poor", min: 201, max: 300, color: "bg-orange-500" },
  { label: "Very Poor", min: 301, max: 400, color: "bg-rose-600" },
  { label: "Severe", min: 401, max: 500, color: "bg-purple-700" },
];

export const AqiSpectrumBar: React.FC<AqiSpectrumBarProps> = ({ aqi, category }) => {
  const markerPct = Math.min(Math.max((aqi / 500) * 100, 2), 98);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-text-primary">
          CPCB National AQI Spectrum Position
        </span>
        <span className="font-bold text-primary">
          Est. AQI {aqi} • {category}
        </span>
      </div>

      {/* Category Labels */}
      <div className="grid grid-cols-6 text-center text-[10px] sm:text-xs font-medium text-text-secondary">
        {BANDS.map((b) => (
          <span key={b.label} className="truncate">
            {b.label}
          </span>
        ))}
      </div>

      {/* Colored Bar + Glowing Indicator Dot */}
      <div className="relative h-3 w-full rounded-full flex overflow-visible">
        {BANDS.map((b, i) => (
          <div
            key={b.label}
            className={`h-full flex-1 ${b.color} ${
              i === 0 ? "rounded-l-full" : i === BANDS.length - 1 ? "rounded-r-full" : ""
            }`}
          />
        ))}
        <div
          style={{ left: `${markerPct}%` }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-4 border-white bg-slate-900 shadow-md dark:border-slate-950 dark:bg-white transition-all duration-500"
          title={`Current AQI: ${aqi}`}
        />
      </div>

      {/* Numeric Ticks */}
      <div className="flex justify-between text-[10px] font-medium text-text-secondary">
        <span>0</span>
        <span>50</span>
        <span>100</span>
        <span>200</span>
        <span>300</span>
        <span>400</span>
        <span>500+</span>
      </div>
    </div>
  );
};