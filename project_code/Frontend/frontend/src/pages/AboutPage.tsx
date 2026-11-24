import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Database,
  Cpu,
  Globe2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const PILLARS = [
  {
    icon: Globe2,
    title: "All-India Coverage",
    description:
      "Built to monitor and classify ambient air quality across Indian cities and states—from metro corridors to industrial hubs—without login barriers.",
  },
  {
    icon: Cpu,
    title: "AdaBoost Multi-Class Engine",
    description:
      "Powered by an AdaBoost ensemble achieving 0.9072 Macro-F1 across CPCB air quality categories, outperforming single Decision Tree baselines (0.7937 Macro-F1).",
  },
  {
    icon: Database,
    title: "Leakage-Free Historical Training",
    description:
      "Trained on 36,530 station-day records spanning 2015–2024 using a strict chronological split (2015–2022 train vs. 2023–2024 holdout test).",
  },
  {
    icon: ShieldCheck,
    title: "Unit & Scale Alignment",
    description:
      "Automatically normalizes live Carbon Monoxide (CO) readings between µg/m³ and mg/m³ so live station telemetry matches historical training distributions.",
  },
];

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "7-Pollutant Ingestion",
    detail:
      "Collects PM2.5, PM10, NO2, SO2, CO, O3, and NH3 concentrations from live station snapshots or interactive user simulation.",
  },
  {
    step: "02",
    title: "CPCB Sub-Index Calibration",
    detail:
      "Derives ground-truth AQI buckets (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) directly from CPCB breakpoint formulas.",
  },
  {
    step: "03",
    title: "Real-Time Inference & Confidence",
    detail:
      "FastAPI serves predicted categories alongside full class probability distributions via the /predict and /stations/live endpoints.",
  },
];

export function AboutPage() {
  return (
    <div className="bg-background text-text-primary">
      {/* About Hero */}
      <section className="border-b border-border bg-[radial-gradient(circle_at_20%_20%,rgba(37,169,120,0.14),transparent_45%),#0B1118]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary-light">
            About AIRWATCH AI
          </span>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Accessible Environmental Intelligence for{" "}
            <span className="text-primary">Every Indian City</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
            AIRWATCH AI bridges historical environmental data science and real-time station
            telemetry—giving researchers, students, and citizens instant visibility into Indian
            air quality without paywalls or account gates.
          </p>

          <div className="mt-8 flex flex-wrap gap-3.5">
            <a href="/#ml-predictor" className="btn-primary">
              Try the ML Predictor
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link to="/contact" className="btn-secondary">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Why We Built AIRWATCH AI
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Raw pollutant numbers can be hard to interpret across different measurement units.
            Our platform standardizes multi-pollutant inputs into clear, actionable CPCB categories.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {PILLARS.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="surface-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How the Pipeline Works */}
      <section className="border-t border-border bg-surface-dark/60">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            End-to-End Architecture
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            From raw station telemetry to calibrated multi-class AQI predictions in three stages.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PIPELINE_STEPS.map((s) => (
              <div key={s.step} className="surface-card p-6">
                <span className="font-display text-xs font-bold tracking-widest text-primary">
                  STAGE {s.step}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold text-text-primary">
                  {s.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                  {s.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-border bg-surface p-5 text-xs text-text-secondary">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                <strong className="text-text-primary">Transparency Note:</strong> AIRWATCH AI is an
                analytical and educational machine-learning platform. While trained on CPCB-aligned
                thresholds, real-time outputs do not replace official regulatory advisories issued
                by the Central Pollution Control Board (CPCB) or State Pollution Control Boards.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}