import React, { useState } from "react";
import { HeartPulse, Activity, Wind, Users, ShieldCheck } from "lucide-react";
import type { AQICategory, SensitiveGroup } from "../../types/airQuality";

interface HealthAdvisoryCardProps {
  aqi: number;
  category: AQICategory;
  dominantPollutant: string;
}

const GROUP_LABELS: Record<SensitiveGroup, { label: string; icon: React.ReactNode }> = {
  general: { label: "General Public", icon: <Users className="h-4 w-4" /> },
  respiratory: { label: "Asthma / Sensitive", icon: <HeartPulse className="h-4 w-4" /> },
  athletes: { label: "Outdoor Runners", icon: <Activity className="h-4 w-4" /> },
  elderly_children: { label: "Elderly & Kids", icon: <ShieldCheck className="h-4 w-4" /> },
};

export const HealthAdvisoryCard: React.FC<HealthAdvisoryCardProps> = ({
  aqi,
  category,
  dominantPollutant,
}) => {
  const [group, setGroup] = useState<SensitiveGroup>("general");

  const getRecommendations = (): { outdoor: string; mask: string; indoor: string } => {
    const isHigh = aqi > 200;
    const isModerate = aqi > 100 && aqi <= 200;

    if (group === "respiratory") {
      return isHigh
        ? {
            outdoor:
              "Avoid all outdoor exertion. Keep rescue inhalers or prescribed medication accessible.",
            mask: "Wear a properly fitted N95/FFP2 respirator if stepping outside is unavoidable.",
            indoor: "Keep windows closed and run an air purifier on medium-high mode.",
          }
        : {
            outdoor:
              "Limit prolonged outdoor exposure during peak traffic hours (8–11 AM, 6–9 PM).",
            mask: "Recommended in high-traffic corridors due to elevated particulate load.",
            indoor: "Ensure cross-ventilation only during cleaner afternoon hours.",
          };
    }

    if (group === "athletes") {
      return isHigh
        ? {
            outdoor:
              "Move workouts indoors. High breathing rates significantly increase deep lung particle intake.",
            mask: "Avoid high-intensity cardio outdoors even with a mask.",
            indoor: "Opt for indoor treadmill, yoga, or strength training today.",
          }
        : isModerate
        ? {
            outdoor:
              "Reduce workout intensity or duration by 30%; prefer parks away from main roads.",
            mask: "Not required for light jogging, monitor for throat irritation.",
            indoor: "Hydrate well post-session to help clear airways.",
          }
        : {
            outdoor: "Good conditions for outdoor running and endurance training.",
            mask: "No mask required.",
            indoor: "Normal ventilation is safe.",
          };
    }

    if (group === "elderly_children") {
      return isHigh
        ? {
            outdoor: "Restrict outdoor play and morning walks until AQI drops below 150.",
            mask: "Use child-sized or well-sealed N95 masks during transit.",
            indoor: "Avoid burning incense, candles, or indoor smoke sources.",
          }
        : {
            outdoor: "Short outdoor walks are fine; avoid dusty or construction-heavy zones.",
            mask: "Optional near busy intersections.",
            indoor: "Keep living spaces dust-free with damp mopping.",
          };
    }

    // General public
    return isHigh
      ? {
          outdoor:
            "Limit prolonged outdoor exertion; reschedule non-essential outdoor errands.",
          mask: "N95 mask advised for commuters and two-wheeler riders.",
          indoor: "Seal gaps around windows and use recirculation mode in car AC.",
        }
      : isModerate
      ? {
          outdoor:
            "Acceptable for most people; take breaks if you notice coughing or eye irritation.",
          mask: "Optional for short commutes.",
          indoor: "Standard indoor ventilation is fine.",
        }
      : {
          outdoor: "Air quality is satisfactory. Ideal time for outdoor activities.",
          mask: "Not needed.",
          indoor: "Open windows to circulate fresh air.",
        };
  };

  const advice = getRecommendations();

  return (
    <div className="surface-card flex h-full flex-col justify-between p-5">
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-text-primary">
              Actionable Health Advisory
            </h3>
            <p className="text-xs text-text-secondary">
              Tailored guidance based on AQI{" "}
              <span className="font-semibold text-text-primary">
                {aqi} ({category})
              </span>{" "}
              &amp; primary driver{" "}
              <span className="font-semibold text-primary-dark">{dominantPollutant}</span>
            </p>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-pink-200 bg-pink-50 text-primary">
            <Wind className="h-4 w-4" />
          </div>
        </div>

        {/* Persona Switcher — 2x2 grid prevents label clipping */}
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-border bg-[#FAF8F6] p-1.5">
          {(Object.keys(GROUP_LABELS) as SensitiveGroup[]).map((key) => {
            const active = group === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setGroup(key)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-primary text-white shadow-2xs"
                    : "text-text-secondary hover:bg-pink-100/60 hover:text-text-primary"
                }`}
              >
                {GROUP_LABELS[key].icon}
                <span className="whitespace-nowrap">{GROUP_LABELS[key].label}</span>
              </button>
            );
          })}
        </div>

        {/* Advisory Rows */}
        <div className="space-y-2.5 text-sm">
          <div className="rounded-xl border border-pink-100 bg-[#FFF5F9] p-3">
            <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-primary-dark">
              Outdoor Activity
            </span>
            <p className="text-xs text-text-primary sm:text-sm">{advice.outdoor}</p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-[#F3FBF9] p-3">
            <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-teal-700">
              Mask &amp; Protection
            </span>
            <p className="text-xs text-text-primary sm:text-sm">{advice.mask}</p>
          </div>
          <div className="rounded-xl border border-border bg-[#FAF8F6] p-3">
            <span className="mb-0.5 block text-xs font-bold uppercase tracking-wider text-amber-700">
              Indoor Environment
            </span>
            <p className="text-xs text-text-primary sm:text-sm">{advice.indoor}</p>
          </div>
        </div>
      </div>
    </div>
  );
};