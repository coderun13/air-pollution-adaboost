import React, { useState } from 'react';
import { AlertTriangle, Info, ShieldAlert, ChevronDown, ChevronUp, Sparkles, Clock } from 'lucide-react';
import type { AirAlert } from '../../types/airQuality';

interface AlertBannerProps {
  alerts: AirAlert[];
  onAskAI?: (prompt: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onAskAI }) => {
  const [expandedId, setExpandedId] = useState<string | null>(alerts[0]?.id ?? null);

  if (!alerts.length) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-300 flex items-center gap-3">
        <Info className="w-5 h-5 text-emerald-400 shrink-0" />
        <span>No active pollution thresholds or rapid deterioration alerts triggered for this station.</span>
      </div>
    );
  }

  const getSeverityStyles = (severity: AirAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          wrapper: 'border-rose-500/40 bg-rose-950/30 text-rose-100',
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          icon: <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />,
        };
      case 'warning':
        return {
          wrapper: 'border-amber-500/40 bg-amber-950/30 text-amber-100',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
        };
      default:
        return {
          wrapper: 'border-sky-500/40 bg-sky-950/30 text-sky-100',
          badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
          icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
        };
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const styles = getSeverityStyles(alert.severity);
        const isExpanded = expandedId === alert.id;

        return (
          <div
            key={alert.id}
            className={`rounded-xl border p-4 transition-all ${styles.wrapper}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{styles.icon}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm md:text-base">{alert.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${styles.badge}`}>
                      {alert.engineVersion}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {alert.timestamp}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{alert.summary}</p>
                </div>
              </div>

              <button
                onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 shrink-0"
              >
                {isExpanded ? 'Hide Details' : 'Why Triggered?'}
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-white/10 text-xs space-y-2 text-slate-300">
                <div>
                  <span className="font-semibold text-slate-200">Trigger Condition: </span>
                  <code className="bg-black/30 px-2 py-0.5 rounded text-amber-300">{alert.triggerRule}</code>
                </div>
                {alert.aiExplanation && (
                  <div className="bg-black/25 p-3 rounded-lg border border-white/5">
                    <span className="font-semibold text-indigo-300 flex items-center gap-1 mb-1">
                      <Sparkles className="w-3.5 h-3.5" /> AI Context Summary
                    </span>
                    <p className="leading-relaxed">{alert.aiExplanation}</p>
                  </div>
                )}
                {onAskAI && (
                  <button
                    onClick={() => onAskAI(`Explain why the "${alert.title}" alert triggered and what I should do.`)}
                    className="inline-flex items-center gap-1.5 text-indigo-300 hover:text-indigo-200 font-medium pt-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Ask AIRWATCH AI about this alert →
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};