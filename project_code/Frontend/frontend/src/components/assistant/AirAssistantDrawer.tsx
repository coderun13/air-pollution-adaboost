import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, FileText, Copy, Check } from 'lucide-react';
import type { StationContext } from '../../types/airQuality';

interface AirAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  station: StationContext;
  initialPrompt?: string | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isReport?: boolean;
}

export const AirAssistantDrawer: React.FC<AirAssistantDrawerProps> = ({
  isOpen,
  onClose,
  station,
  initialPrompt,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Connected to **${station.stationName}, ${station.city}** (Current AQI: ${station.aqi} — ${station.category}). Ask me about pollutant drivers, city comparisons, outdoor safety, or generate today's brief.`,
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Reset intro context when station changes
  useEffect(() => {
    setMessages([
      {
        id: `ctx-${station.stationName}`,
        role: 'assistant',
        content: `Switched context to **${station.stationName}, ${station.city}** (AQI ${station.aqi} • ${station.category}). What would you like to inspect?`,
      },
    ]);
  }, [station.stationName, station.city, station.aqi, station.category]);

  // Handle external trigger (e.g., "Ask AI about this alert")
  useEffect(() => {
    if (initialPrompt && isOpen) {
      handleSend(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Contextual rule + data-grounded response generator (swap with your backend LLM endpoint anytime)
  const buildGroundedReply = (query: string): { text: string; isReport?: boolean } => {
    const q = query.toLowerCase();
    const activePollutants = station.pollutants.filter((p) => p.value !== null);
    const missingPollutants = station.pollutants.filter((p) => p.value === null);
    const topTwo = [...activePollutants]
      .sort((a, b) => b.value! / b.safeLimit - a.value! / a.safeLimit)
      .slice(0, 2);

    if (q.includes('report') || q.includes('brief') || q.includes('summary')) {
      const reportText = [
        `AIRWATCH AI — DAILY AIR QUALITY BRIEF`,
        `Location: ${station.stationName}, ${station.city}`,
        `Overall Status: AQI ${station.aqi} (${station.category}) | Updated: ${station.lastUpdated}`,
        `Primary Drivers: ${topTwo.map((p) => `${p.id} (${p.value} ${p.unit}, ${p.trend})`).join(' & ')}`,
        `Active Alerts: ${station.activeAlerts.length > 0 ? station.activeAlerts.map((a) => a.title).join('; ') : 'None'}`,
        `Data Transparency Note: ${
          missingPollutants.length
            ? `Sensors unavailable for ${missingPollutants.map((m) => m.id).join(', ')}.`
            : 'All station sensors reporting normally.'
        }`,
        `Advisory: ${
          station.aqi > 200
            ? 'Limit prolonged outdoor exertion; N95 protection advised for sensitive groups.'
            : 'Moderate conditions; monitor hourly trend before strenuous outdoor exercise.'
        }`,
      ].join('\n');

      return { text: reportText, isReport: true };
    }

    if (q.includes('why') || q.includes('bad') || q.includes('high') || q.includes('cause')) {
      return {
        text: `In ${station.city} (${station.stationName}), current AQI is ${station.aqi} (${station.category}). The main contributors are ${topTwo
          .map((p) => `${p.id} at ${p.value} ${p.unit} (${p.sourceHint.toLowerCase()})`)
          .join(' and ')}. Recent stored readings show ${
          topTwo[0]?.trend === 'rising' ? 'an upward accumulation trend' : 'elevated baseline levels'
        }. Local wind dispersion data is needed to confirm stagnation effects.`,
      };
    }

    if (q.includes('run') || q.includes('outside') || q.includes('exercise') || q.includes('safe')) {
      return {
        text:
          station.aqi > 200
            ? `With AQI at ${station.aqi} (${station.category}) and ${topTwo[0]?.id} elevated, outdoor running is not recommended right now—high breathing rates draw fine particulates deeper into the lungs. Consider an indoor session until levels ease.`
            : `AQI is currently ${station.aqi} (${station.category}). Light-to-moderate outdoor exercise is acceptable for healthy adults, though sensitive individuals should avoid high-traffic roads.`,
      };
    }

    if (q.includes('compare')) {
      return {
        text: `${station.city} is currently recording AQI ${station.aqi} (${station.category}), driven primarily by ${topTwo[0]?.id} (${topTwo[0]?.value} ${topTwo[0]?.unit}). Open the City Comparison view to benchmark multi-day historical curves and pollutant ratios side-by-side against another station.`,
      };
    }

    return {
      text: `Based on live telemetry from ${station.stationName}: AQI is ${station.aqi} (${station.category}). Top active pollutants are ${topTwo
        .map((p) => `${p.id} (${p.value} ${p.unit})`)
        .join(', ')}. ${
        missingPollutants.length
          ? `Note: ${missingPollutants.map((m) => m.id).join(', ')} readings are not reported by this station.`
          : ''
      }`,
    };
  };

  const handleSend = (overrideText?: string) => {
    const prompt = (overrideText ?? input).trim();
    if (!prompt) return;

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: prompt };
    const reply = buildGroundedReply(prompt);
    const botMsg: ChatMessage = {
      id: `a-${Date.now() + 1}`,
      role: 'assistant',
      content: reply.text,
      isReport: reply.isReport,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    if (!overrideText) setInput('');
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  if (!isOpen) return null;

  const quickPrompts = [
    `Why is AQI ${station.category.toLowerCase()} in ${station.city} today?`,
    'Should I go running outside today?',
    'Summarize top pollutants & missing sensors',
    'Generate daily air-quality report',
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                Ask AIRWATCH AI <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              </h3>
              <p className="text-[11px] text-slate-400">
                Grounded in {station.stationName} • AQI {station.aqi}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : msg.isReport
                    ? 'bg-slate-900 border border-indigo-500/40 text-slate-200 font-mono text-xs whitespace-pre-line'
                    : 'bg-slate-900 border border-slate-800 text-slate-200'
                }`}
              >
                {msg.isReport && (
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 font-sans">
                    <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Daily Briefing
                    </span>
                    <button
                      onClick={() => copyText(msg.id, msg.content)}
                      className="text-xs flex items-center gap-1 text-slate-400 hover:text-white"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === msg.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick Prompt Chips */}
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-900/40 flex gap-1.5 overflow-x-auto">
          {quickPrompts.map((qp) => (
            <button
              key={qp}
              onClick={() => handleSend(qp)}
              className="text-xs whitespace-nowrap px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${station.city}'s air quality...`}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};