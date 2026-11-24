import { Link } from "react-router-dom";
import { Wind, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {/* Brand Column */}
          <div className="space-y-3 md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <Wind className="h-4 w-4" />
              </div>
              <span className="font-display text-base font-bold text-text-primary">
                AIRWATCH AI
              </span>
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-text-secondary">
              Integrated air-quality monitoring, multi-pollutant analysis, ML forecasting, and
              actionable respiratory guidance across Indian monitoring stations.
            </p>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Transparent sensor reporting • Informational guidance only</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-2.5 md:col-span-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li>
                <Link to="/analytics" className="hover:text-primary transition">
                  Pollutant Analytics &amp; Health Advisory
                </Link>
              </li>
              <li>
                <Link to="/compare" className="hover:text-primary transition">
                  Side-by-Side City Comparison
                </Link>
              </li>
              <li>
                <Link to="/predict" className="hover:text-primary transition">
                  ML Classifier &amp; Model Benchmarks
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-primary transition">
                  Interactive India Air Quality Map
                </Link>
              </li>
            </ul>
          </div>

          {/* Project & Methodology */}
          <div className="space-y-2.5 md:col-span-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              Research &amp; Info
            </h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li>
                <Link to="/about" className="hover:text-primary transition">
                  Methodology &amp; Pipeline
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary transition">
                  Contact &amp; Feedback
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-[11px] text-text-secondary sm:flex-row">
          <span>© {new Date().getFullYear()} AIRWATCH AI. All rights reserved.</span>
          <span>Built with FastAPI, React, TypeScript &amp; Explainable ML</span>
        </div>
      </div>
    </footer>
  );
}