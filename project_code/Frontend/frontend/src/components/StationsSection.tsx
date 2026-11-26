import { useMemo, useState } from "react";
import { MapPin, Search, SlidersHorizontal, BarChart2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { LiveStation } from "../services/api";

interface StationsSectionProps {
  stations: LiveStation[];
  liveApi: boolean;
  onSelectForPrediction: (station: LiveStation) => void;
}

const CATEGORY_STYLE: Record<string, string> = {
  Good: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  Satisfactory: "border-teal-500/30 bg-teal-500/15 text-teal-300",
  Moderate: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  Poor: "border-orange-500/30 bg-orange-500/15 text-orange-300",
  "Very Poor": "border-red-500/30 bg-red-500/15 text-red-300",
  Severe: "border-purple-500/30 bg-purple-500/15 text-purple-300",
};

export function StationsSection({
  stations,
  liveApi,
  onSelectForPrediction,
}: StationsSectionProps) {
  const [selectedCity, setSelectedCity] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const cities = useMemo(() => {
    const unique = new Set<string>();
    stations.forEach((s) => {
      if (s.city) unique.add(String(s.city));
    });
    return ["All", ...Array.from(unique).sort()];
  }, [stations]);

  const cityComparisonData = useMemo(() => {
    const grouped = new Map<
      string,
      { city: string; pm25Sum: number; pm10Sum: number; count: number }
    >();

    stations.forEach((st) => {
      const city = String(st.city || "Unknown");
      const pm25 = Number(st["PM2.5_avg"] ?? 0);
      const pm10 = Number(st.PM10_avg ?? 0);
      if (!grouped.has(city)) {
        grouped.set(city, { city, pm25Sum: 0, pm10Sum: 0, count: 0 });
      }
      const entry = grouped.get(city)!;
      entry.pm25Sum += pm25;
      entry.pm10Sum += pm10;
      entry.count += 1;
    });

    return Array.from(grouped.values())
      .map((item) => ({
        city: item.city,
        PM2_5: Number((item.pm25Sum / item.count).toFixed(1)),
        PM10: Number((item.pm10Sum / item.count).toFixed(1)),
      }))
      .sort((a, b) => b.PM2_5 - a.PM2_5)
      .slice(0, 10);
  }, [stations]);

  const filteredStations = useMemo(() => {
    return stations.filter((st) => {
      const matchesCity =
        selectedCity === "All" ||
        String(st.city || "").toLowerCase() === selectedCity.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(st.station || "").toLowerCase().includes(q) ||
        String(st.city || "").toLowerCase().includes(q) ||
        String(st.state || "").toLowerCase().includes(q);
      return matchesCity && matchesSearch;
    });
  }, [stations, selectedCity, searchQuery]);

  return (
    <section id="live-stations" className="scroll-mt-24 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <MapPin className="h-3.5 w-3.5" />
            <span>Nationwide Monitoring Network</span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold text-text-primary sm:text-3xl">
            Live Indian Stations
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Compare particulate matter across Indian cities, filter stations, or load readings
            directly into the ML Predictor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city, state, or station..."
              className="field-input w-56 pl-9"
            />
          </div>

          <select
            aria-label="Filter by city"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="field-input w-40"
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city === "All" ? "All Cities" : city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* City-wise Particulate Comparison Chart */}
      {cityComparisonData.length > 0 && (
        <div className="surface-card p-6">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                <BarChart2 className="h-3.5 w-3.5" />
                <span>City-Wise Particulate Comparison</span>
              </div>
              <h3 className="mt-0.5 font-display text-lg font-semibold text-text-primary">
                Average PM2.5 vs. PM10 Concentration (µg/m³)
              </h3>
            </div>
            <span className="text-xs text-text-muted">
              Click a bar or use the filter dropdown to focus on a city
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cityComparisonData}
                margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
                onClick={(state) => {
                  if (state?.activeLabel) {
                    const clickedCity = String(state.activeLabel);
                    setSelectedCity((prev) => (prev === clickedCity ? "All" : clickedCity));
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D3D" vertical={false} />
                <XAxis
                  dataKey="city"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#1A2A3A" }}
                  contentStyle={{
                    backgroundColor: "#141F2B",
                    borderColor: "#1E2D3D",
                    borderRadius: "8px",
                    color: "#E8EDF2",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar
                  dataKey="PM2_5"
                  name="PM2.5 (µg/m³)"
                  fill="#25A978"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="PM10"
                  name="PM10 (µg/m³)"
                  fill="#0D9488"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Station Cards Grid */}
      {filteredStations.length === 0 ? (
        <div className="surface-card p-10 text-center text-sm text-text-secondary">
          No monitoring stations match your current filter. Try clearing the search or selecting{" "}
          <strong className="text-text-primary">All Cities</strong>.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStations.map((st, idx) => {
            const category = st.ml_predicted_category || "Moderate";
            const badgeClass =
              CATEGORY_STYLE[category] ||
              "border-border bg-surface-light text-text-primary";
            const confidenceText =
              typeof st.ml_confidence === "number"
                ? `${(st.ml_confidence * 100).toFixed(1)}% conf`
                : "CPCB features";

            return (
              <article
                key={`${st.station || "station"}-${idx}`}
                className="surface-card flex flex-col justify-between p-5 transition hover:border-border-light"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-primary">
                        {st.city || "India"}
                        {st.state ? ` · ${st.state}` : ""}
                      </p>
                      <h3 className="mt-0.5 font-display text-base font-semibold text-text-primary line-clamp-1">
                        {st.station || "CPCB Monitoring Station"}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
                    >
                      {category}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2 rounded-lg border border-border/60 bg-surface-dark p-3 text-center text-xs">
                    <div>
                      <div className="text-text-muted">PM2.5</div>
                      <div className="mt-0.5 font-semibold text-text-primary">
                        {st["PM2.5_avg"] ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-muted">PM10</div>
                      <div className="mt-0.5 font-semibold text-text-primary">
                        {st.PM10_avg ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-muted">NO2</div>
                      <div className="mt-0.5 font-semibold text-text-primary">
                        {st.NO2_avg ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-text-muted">CO</div>
                      <div className="mt-0.5 font-semibold text-text-primary">
                        {st.CO_normalized ?? st.CO_avg ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                  <span className="text-text-muted">{confidenceText}</span>
                  <button
                    type="button"
                    onClick={() => onSelectForPrediction(st)}
                    className="inline-flex items-center gap-1 font-medium text-primary transition hover:text-primary-light"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Load into Predictor
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}