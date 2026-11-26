import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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

function resolveCoords(station: LiveStation, index: number) {
  const rawLat = Number(station.lat ?? station.latitude);
  const rawLon = Number(station.lon ?? station.longitude);

  if (Number.isFinite(rawLat) && rawLat !== 0 && Number.isFinite(rawLon) && rawLon !== 0) {
    return { lat: rawLat, lon: rawLon };
  }

  const cityKey = Object.keys(CITY_COORDS).find(
    (k) => k.toLowerCase() === String(station.city || "").trim().toLowerCase()
  );
  if (cityKey) {
    return CITY_COORDS[cityKey];
  }

  const angle = (index * 137.5 * Math.PI) / 180;
  const radius = 2.0 + (index % 5) * 0.9;
  return {
    lat: Number((21.5 + Math.sin(angle) * radius).toFixed(2)),
    lon: Number((79.0 + Math.cos(angle) * radius).toFixed(2)),
  };
}

function getCategoryHex(category?: string | null) {
  switch (category) {
    case "Good":
      return "#10b981";
    case "Satisfactory":
      return "#0d9488";
    case "Moderate":
      return "#f59e0b";
    case "Poor":
      return "#f97316";
    case "Very Poor":
      return "#e11d48";
    case "Severe":
      return "#9333ea";
    default:
      return "#db2777";
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

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const plottedStations = useMemo(() => {
    return stations.map((st, idx) => ({
      station: st,
      index: idx,
      coords: resolveCoords(st, idx),
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

  // Initialize Leaflet map centered on India using OpenStreetMap tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.3, 79.2],
      zoom: 5,
      minZoom: 4,
      maxZoom: 11,
      zoomControl: true,
    });

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Render station pins on Leaflet map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    visibleStations.forEach(({ station, index, coords }) => {
      const isSelected = activeItem?.index === index;
      const color = getCategoryHex(station.ml_predicted_category);
      const label = station.city || `Node ${index + 1}`;

      const icon = L.divIcon({
        className: "custom-station-pin",
        html: `
          <div style="transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <span style="
              display: block;
              width: ${isSelected ? "18px" : "14px"};
              height: ${isSelected ? "18px" : "14px"};
              border-radius: 9999px;
              background: ${color};
              border: 3px solid #ffffff;
              box-shadow: 0 0 0 ${isSelected ? "5px rgba(219, 39, 119, 0.35)" : "3px rgba(0,0,0,0.12)"};
            "></span>
            <span style="
              margin-top: 4px;
              padding: 2px 7px;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 700;
              white-space: nowrap;
              background: ${isSelected ? "#db2777" : "#ffffff"};
              color: ${isSelected ? "#ffffff" : "#18181b"};
              border: 1px solid ${isSelected ? "#be185d" : "#e5ddd7"};
              box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            ">${label}</span>
          </div>
        `,
        iconSize: [0, 0],
      });

      const marker = L.marker([coords.lat, coords.lon], { icon });
      marker.on("click", () => {
        setSelectedIndex(index);
      });
      marker.addTo(layerGroup);
    });
  }, [visibleStations, activeItem]);

  // Smoothly pan when user selects a station
  useEffect(() => {
    if (activeItem && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([activeItem.coords.lat, activeItem.coords.lon], {
        animate: true,
      });
    }
  }, [activeItem]);

  const handleSimulate = (station: LiveStation) => {
    onSelectForPrediction(station);
    navigate("/predict");
  };

  const handleInspectAnalytics = (station: LiveStation) => {
    onSelectForPrediction(station);
    navigate("/dashboard");
  };

  return (
    <div className="bg-background text-text-primary">
      <style>{`
        .bright-blush-map .leaflet-tile-pane {
          filter: brightness(1.08) saturate(0.45) hue-rotate(312deg) contrast(0.9);
        }
        .bright-blush-map .leaflet-container {
          background: #faf8f6;
        }
      `}</style>

      {/* Bright Off-White + Blush Header Banner */}
      <section className="border-b border-border-light bg-gradient-to-r from-[#FFF5F9] via-[#FAF8F6] to-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary-dark">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>All-India Geospatial Intelligence</span>
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Interactive <span className="text-primary">India Air Quality Map</span>
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-text-secondary">
              Real geographic map of Indian monitoring stations with live pollutant readings and
              ML simulation shortcuts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <select
              aria-label="Filter map markers by AQI category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="field-input w-44 bg-white"
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

      {/* Map + Inspector Grid */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Real Map Canvas */}
          <div className="surface-card relative p-4 lg:col-span-8">
            <div className="mb-3 flex items-center justify-between text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary">
                <MapPin className="h-4 w-4 text-primary" />
                India Monitoring Network ({visibleStations.length} active nodes)
              </span>
              <span className="text-text-muted">Zoom, pan, or click a station pin</span>
            </div>

            <div className="bright-blush-map relative h-[470px] w-full overflow-hidden rounded-xl border border-border-light bg-[#FAF8F6]">
              <div ref={mapContainerRef} className="z-0 h-full w-full" />

              {/* Bright Legend Overlay */}
              <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white/95 px-3 py-1.5 text-[10px] font-medium text-text-secondary shadow-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Good/Sat.
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Moderate
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-orange-500" /> Poor
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-600" /> Very Poor
                </span>
              </div>
            </div>
          </div>

          {/* Selected Station Inspector Card */}
          <div className="lg:col-span-4">
            {activeItem ? (
              <div className="surface-card flex h-full flex-col justify-between p-6">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary-dark">
                        Selected Station
                      </span>
                      <h2 className="mt-1 font-display text-xl font-bold text-text-primary">
                        {activeItem.station.station || "CPCB Monitoring Station"}
                      </h2>
                      <p className="text-xs text-text-secondary">
                        {activeItem.station.city || "India"}
                        {activeItem.station.state ? `, ${activeItem.station.state}` : ""} · (
                        {activeItem.coords.lat.toFixed(2)}°N, {activeItem.coords.lon.toFixed(2)}°E)
                      </p>
                    </div>

                    <span className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-xs font-bold text-primary-dark">
                      {activeItem.station.ml_predicted_category || "Moderate"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
                      <div className="text-text-secondary">PM2.5</div>
                      <div className="mt-1 font-display text-lg font-bold text-text-primary">
                        {activeItem.station["PM2.5_avg"] ?? "—"}{" "}
                        <span className="text-xs font-normal text-text-secondary">µg/m³</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
                      <div className="text-text-secondary">PM10</div>
                      <div className="mt-1 font-display text-lg font-bold text-text-primary">
                        {activeItem.station.PM10_avg ?? "—"}{" "}
                        <span className="text-xs font-normal text-text-secondary">µg/m³</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
                      <div className="text-text-secondary">NO₂</div>
                      <div className="mt-1 font-display text-lg font-bold text-text-primary">
                        {activeItem.station.NO2_avg ?? "—"}{" "}
                        <span className="text-xs font-normal text-text-secondary">µg/m³</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
                      <div className="text-text-secondary">SO₂</div>
                      <div className="mt-1 font-display text-lg font-bold text-text-primary">
                        {activeItem.station.SO2_avg ?? "—"}{" "}
                        <span className="text-xs font-normal text-text-secondary">µg/m³</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
                      <div className="text-text-secondary">CO (Norm.)</div>
                      <div className="mt-1 font-display text-lg font-bold text-text-primary">
                        {activeItem.station.CO_normalized ??
                          activeItem.station.CO_avg ??
                          "—"}{" "}
                        <span className="text-xs font-normal text-text-secondary">mg/m³</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
                      <div className="text-text-secondary">O₃ / NH₃</div>
                      <div className="mt-1 font-display text-sm font-bold text-text-primary">
                        {activeItem.station.OZONE_avg ?? "—"} /{" "}
                        {activeItem.station.NH3_avg ?? "—"}
                      </div>
                    </div>
                  </div>

                  {typeof activeItem.station.ml_confidence === "number" && (
                    <div className="mt-4 flex items-center gap-2 rounded-xl border border-pink-100 bg-[#FFF5F9] px-3 py-2 text-xs text-text-secondary">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
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
                    className="btn-secondary w-full text-xs"
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
              <div className="surface-card p-8 text-center text-sm text-text-secondary">
                No stations available for this filter.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}