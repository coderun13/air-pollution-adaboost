import React, { useState } from 'react';
import { HeartPulse, Activity, Wind, Users, ShieldCheck } from 'lucide-react';
import type { AQICategory, SensitiveGroup } from '../../types/airQuality';

interface HealthAdvisoryCardProps {
  aqi: number;
  category: AQICategory;
  dominantPollutant: string;
}

const GROUP_LABELS: Record<SensitiveGroup, { label: string; icon: React.ReactNode }> = {
  general: { label: 'General Public', icon: <Users className="w-4 h-4" /> },
  respiratory: { label: 'Asthma / Sensitive', icon: <HeartPulse className="w-4 h-4" /> },
  athletes: { label: 'Outdoor Runners', icon: <Activity className="w-4 h-4" /> },
  elderly_children: { label: 'Elderly & Kids', icon: <ShieldCheck className="w-4 h-4" /> },
};

export const HealthAdvisoryCard: React.FC<HealthAdvisoryCardProps> = ({
  aqi,
  category,
  dominantPollutant,
}) => {
  const [group, setGroup] = useState<SensitiveGroup>('general');

  const getRecommendations = (): { outdoor: string; mask: string; indoor: string } => {
    const isHigh = aqi > 200;
    const isModerate = aqi > 100 && aqi <= 200;

    if (group === 'respiratory') {
      return isHigh
        ? {
            outdoor: 'Avoid all outdoor exertion. Keep rescue inhalers or prescribed medication accessible.',
            mask: 'Wear a properly fitted N95/FFP2 respirator if stepping outside is unavoidable.',
            indoor: 'Keep windows closed and run an air purifier on medium-high mode.',
          }
        : {
            outdoor: 'Limit prolonged outdoor exposure during peak traffic hours (8–11 AM, 6–9 PM).',
            mask: 'Recommended in high-traffic corridors due to elevated particulate load.',
            indoor: 'Ensure cross-ventilation only during cleaner afternoon hours.',
          };
    }

    if (group === 'athletes') {
      return isHigh
        ? {
            outdoor: 'Move workouts indoors. High breathing rates significantly increase deep lung particle intake.',
            mask: 'Avoid high-intensity cardio outdoors even with a mask.',
            indoor: 'Opt for indoor treadmill, yoga, or strength training today.',
          }
        : isModerate
        ? {
            outdoor: 'Reduce workout intensity or duration by 30%; prefer parks away from main roads.',
            mask: 'Not required for light jogging, monitor for throat irritation.',
            indoor: 'Hydrate well post-session to help clear airways.',
          }
        : {
            outdoor: 'Good conditions for outdoor running and endurance training.',
            mask: 'No mask required.',
            indoor: 'Normal ventilation is safe.',
          };
    }

    if (group === 'elderly_children') {
      return isHigh
        ? {
            outdoor: 'Restrict outdoor play and morning walks until AQI drops below 150.',
            mask: 'Use child-sized or well-sealed N95 masks during transit.',
            indoor: 'Avoid burning incense, candles, or indoor smoke sources.',
          }
        : {
            outdoor: 'Short outdoor walks are fine; avoid dusty or construction-heavy zones.',
            mask: 'Optional near busy intersections.',
            indoor: 'Keep living spaces dust-free with damp mopping.',
          };
    }

    // General public
    return isHigh
      ? {
          outdoor: 'Limit prolonged outdoor exertion; reschedule non-essential outdoor errands.',
          mask: 'N95 mask advised for commuters and two-wheeler riders.',
          indoor: 'Seal gaps around windows and use recirculation mode in car AC.',
        }
      : isModerate
      ? {
          outdoor: 'Acceptable for most people; take breaks if you notice coughing or eye irritation.',
          mask: 'Optional for short commutes.',
          indoor: 'Standard indoor ventilation is fine.',
        }
      : {
          outdoor: 'Air quality is satisfactory. Ideal time for outdoor activities.',
          mask: 'Not needed.',
          indoor: 'Open windows to circulate fresh air.',
        };
  };

  const advice = getRecommendations();

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-semibold text-white">Actionable Health Advisory</h3>
            <p className="text-xs text-slate-400">
              Tailored guidance based on AQI <span className="text-slate-200 font-medium">{aqi} ({category})</span> &amp; primary driver{' '}
              <span className="text-indigo-400 font-medium">{dominantPollutant}</span>
            </p>
          </div>
          <Wind className="w-5 h-5 text-indigo-400" />
        </div>

        {/* Persona Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800 mb-4">
          {(Object.keys(GROUP_LABELS) as SensitiveGroup[]).map((key) => {
            const active = group === key;
            return (
              <button
                key={key}
                onClick={() => setGroup(key)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {GROUP_LABELS[key].icon}
                <span className="truncate">{GROUP_LABELS[key].label}</span>
              </button>
            );
          })}
        </div>

        {/* Advisory Rows */}
        <div className="space-y-2.5 text-sm">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold block mb-0.5">
              Outdoor Activity
            </span>
            <p className="text-slate-200 text-xs sm:text-sm">{advice.outdoor}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold block mb-0.5">
              Mask &amp; Protection
            </span>
            <p className="text-slate-200 text-xs sm:text-sm">{advice.mask}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs uppercase tracking-wider text-sky-300 font-semibold block mb-0.5">
              Indoor Environment
            </span>
            <p className="text-slate-200 text-xs sm:text-sm">{advice.indoor}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
        * Informational air-quality guidance only — not a live emergency alert or clinical medical assessment.
      </p>
    </div>
  );
};