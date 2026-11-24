import { BarChart3, CheckCircle2, Database } from "lucide-react";
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
import type { FeatureImportanceItem, ModelBenchmark } from "../services/api";

interface ModelInsightsProps {
  models: ModelBenchmark[];
  featureImportances: FeatureImportanceItem[];
}

export function ModelInsights({
  models,
  featureImportances,
}: ModelInsightsProps) {
  const chartData = models.map((m) => ({
    name: m.model.replace("_", " "),
    MacroF1: Number((m.macro_f1 * 100).toFixed(2)),
    Accuracy:
      typeof m.accuracy === "number" ? Number((m.accuracy * 100).toFixed(2)) : 0,
  }));

  return (
    <section id="model-insights" className="scroll-mt-24 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <BarChart3 className="h-3.5 w-3.5" />
          <span>Evaluation & Data Integrity</span>
        </div>
        <h2 className="mt-1 font-display text-2xl font-bold text-text-primary sm:text-3xl">
          Model Benchmarks & Dataset Notes
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Trained on 36,530 historical Indian station records (2015–2024) using a chronological
          split (2015–2022 train vs. 2023–2024 test) to prevent temporal data leakage.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Card 1: Recharts Model Benchmark Comparison */}
        <div className="surface-card p-6 lg:col-span-5">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-display text-base font-semibold text-text-primary">
              AdaBoost vs. Decision Tree (%)
            </h3>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Macro-F1 and Accuracy comparison on the 2023–2024 chronological test split
          </p>

          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2D3D" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#94A3B8"
                  fontSize={11}
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
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar
                  dataKey="MacroF1"
                  name="Macro-F1 (%)"
                  fill="#25A978"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Accuracy"
                  name="Accuracy (%)"
                  fill="#38BDF8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Feature Importances */}
        <div className="surface-card p-6 lg:col-span-4">
          <h3 className="font-display text-base font-semibold text-text-primary">
            AdaBoost Feature Importances
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Relative contribution of each pollutant feature in classification
          </p>

          <div className="mt-4 space-y-3 text-xs">
            {featureImportances.map((item, idx) => {
              const pct = Math.min(100, Math.max(0, Number(item.importance) * 100));
              return (
                <div key={`${item.feature}-${idx}`} className="space-y-1">
                  <div className="flex justify-between text-text-secondary">
                    <span className="font-medium text-text-primary">{item.feature}</span>
                    <span>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-dark">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 3: Dataset & Target Safeguards */}
        <div className="surface-card p-6 lg:col-span-3">
          <div className="flex items-center gap-2 text-primary">
            <Database className="h-5 w-5" />
            <h3 className="font-display text-base font-semibold text-text-primary">
              Target & Unit Safeguards
            </h3>
          </div>

          <ul className="mt-4 space-y-3 text-xs leading-relaxed text-text-secondary">
            <li>
              • <strong className="text-text-primary">CPCB Sub-Index Target:</strong> Categories are
              derived from CPCB pollutant sub-index thresholds rather than unverified raw labels.
            </li>
            <li>
              • <strong className="text-text-primary">CO Unit Normalization:</strong> Live CO values
              reported in µg/m³ are normalized to mg/m³ so live inference matches historical
              training units.
            </li>
            <li>
              • <strong className="text-text-primary">Non-Official Notice:</strong> Intended for
              research, analytics, and demonstration—not an official CPCB regulatory report.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}