import { useEffect, useState } from "react";
import { Cpu, RotateCcw, Sparkles } from "lucide-react";
import {
  runAqiPrediction,
  type CoUnit,
  type PollutantInput,
  type PredictionResult,
} from "../services/api";

interface PredictorSectionProps {
  externalValues?: PollutantInput | null;
}

const INITIAL_INPUTS: PollutantInput = {
  PM2_5: 62.0,
  PM10: 124.0,
  NO2: 36.0,
  SO2: 14.0,
  CO: 1.05,
  O3: 34.0,
  NH3: 16.5,
  co_unit: "auto",
};

const POLLUTANT_FIELDS: Array<{
  key: keyof Omit<PollutantInput, "co_unit">;
  label: string;
  unitHint: string;
  step: string;
}> = [
  { key: "PM2_5", label: "PM2.5", unitHint: "µg/m³", step: "0.1" },
  { key: "PM10", label: "PM10", unitHint: "µg/m³", step: "0.1" },
  { key: "NO2", label: "NO2", unitHint: "µg/m³", step: "0.1" },
  { key: "SO2", label: "SO2", unitHint: "µg/m³", step: "0.1" },
  { key: "CO", label: "CO", unitHint: "mg/m³ or µg/m³", step: "0.01" },
  { key: "O3", label: "O3", unitHint: "µg/m³", step: "0.1" },
  { key: "NH3", label: "NH3", unitHint: "µg/m³", step: "0.1" },
];

export function PredictorSection({ externalValues }: PredictorSectionProps) {
  const [formValues, setFormValues] = useState<PollutantInput>(INITIAL_INPUTS);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (externalValues) {
      setFormValues(externalValues);
      setError(null);
    }
  }, [externalValues]);

  const handleNumberChange = (
    field: keyof Omit<PollutantInput, "co_unit">,
    rawValue: string
  ) => {
    const parsed = parseFloat(rawValue);
    setFormValues((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const handleUnitChange = (unit: CoUnit) => {
    setFormValues((prev) => ({ ...prev, co_unit: unit }));
  };

  const handleReset = () => {
    setFormValues(INITIAL_INPUTS);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const prediction = await runAqiPrediction(formValues);
      setResult(prediction);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach FastAPI /predict endpoint. Ensure the backend is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  const sortedProbabilities = Object.entries(result?.class_probabilities ?? {}).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <section id="ml-predictor" className="scroll-mt-24">
      <div className="surface-card p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Form Column */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Cpu className="h-3.5 w-3.5" />
              <span>Interactive Classifier · POST /predict</span>
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold text-text-primary sm:text-3xl">
              7-Pollutant AQI Predictor
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Enter pollutant measurements to classify AQI category with the trained AdaBoost
              model. CO values in µg/m³ (&gt;50) are automatically normalized to mg/m³.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {POLLUTANT_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label htmlFor={`pollutant-${field.key}`} className="field-label">
                      {field.label}{" "}
                      <span className="normal-case text-text-muted">({field.unitHint})</span>
                    </label>
                    <input
                      id={`pollutant-${field.key}`}
                      type="number"
                      step={field.step}
                      min="0"
                      required
                      value={formValues[field.key]}
                      onChange={(e) => handleNumberChange(field.key, e.target.value)}
                      className="field-input"
                    />
                  </div>
                ))}

                <div>
                  <label htmlFor="co-unit-select" className="field-label">
                    CO Unit Mode
                  </label>
                  <select
                    id="co-unit-select"
                    value={formValues.co_unit ?? "auto"}
                    onChange={(e) => handleUnitChange(e.target.value as CoUnit)}
                    className="field-input"
                  >
                    <option value="auto">Auto Detect</option>
                    <option value="mg/m3">mg/m³</option>
                    <option value="ug/m3">µg/m³</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button type="submit" disabled={loading} className="btn-primary">
                  <Sparkles className="h-4 w-4" />
                  {loading ? "Predicting..." : "Predict AQI Category"}
                </button>
                <button type="button" onClick={handleReset} className="btn-secondary">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </form>
          </div>

          {/* Prediction Result Column */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-dark p-6 lg:col-span-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                Prediction Output
              </span>

              {error && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                  {error}
                </div>
              )}

              {result ? (
                <div className="mt-4 space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-text-muted">Predicted Category</div>
                      <div className="mt-1 font-display text-3xl font-bold text-text-primary">
                        {result.predicted_aqi_category}
                      </div>
                    </div>
                    {typeof result.confidence === "number" && (
                      <span className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold text-primary-light">
                        {(result.confidence * 100).toFixed(1)}% confidence
                      </span>
                    )}
                  </div>

                  {sortedProbabilities.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="text-xs font-medium text-text-secondary">
                        Class Probabilities
                      </div>
                      {sortedProbabilities.map(([label, prob]) => (
                        <div key={label} className="space-y-1 text-xs">
                          <div className="flex justify-between text-text-secondary">
                            <span>{label}</span>
                            <span>{(prob * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, prob * 100))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 rounded-lg border border-dashed border-border p-6 text-center text-sm text-text-secondary">
                  Submit pollutant values to see the AdaBoost AQI category and class probability
                  breakdown.
                </div>
              )}
            </div>

            <p className="mt-6 border-t border-border/70 pt-3 text-[11px] text-text-muted">
              {result?.disclaimer ||
                "Model predictions are analytical estimates based on CPCB training targets and are not official CPCB bulletins."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}