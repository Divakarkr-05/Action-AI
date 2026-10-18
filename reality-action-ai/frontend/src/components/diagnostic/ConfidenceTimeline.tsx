import React from 'react';
import type { ConfidenceTimelineEntry } from '../../types';

interface ConfidenceTimelineProps {
  timeline: ConfidenceTimelineEntry[];
}

export const ConfidenceTimeline: React.FC<ConfidenceTimelineProps> = ({ timeline }) => {
  if (timeline.length === 0) return null;

  return (
    <div className="bg-graphite-900 border border-white/[0.08] rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2">
        <span className="font-mono text-xs uppercase tracking-wider text-white/90 font-bold">
          CONFIDENCE EVOLUTION TIMELINE
        </span>
        <span className="text-[10px] font-mono text-lime-400">
          Dynamic Epistemic Update
        </span>
      </div>

      <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
        {timeline.map((entry, idx) => {
          const confPercent = Math.round(entry.confidence * 100);

          return (
            <div key={idx} className="relative flex items-start gap-3 text-xs font-mono">
              {/* Dot */}
              <div
                className={`w-2.5 h-2.5 rounded-full -ml-[19px] mt-1 shrink-0 ${
                  confPercent >= 80
                    ? 'bg-emerald-400 ring-2 ring-emerald-400/20'
                    : confPercent >= 40
                    ? 'bg-amber-400 ring-2 ring-amber-400/20'
                    : 'bg-red-400 ring-2 ring-red-400/20'
                }`}
              />

              <div className="flex-1 bg-graphite-950/60 p-2 rounded-lg border border-white/[0.04]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-white/60 font-semibold">{entry.stage}</span>
                  <span
                    className={`font-bold ${
                      confPercent >= 80
                        ? 'text-emerald-400'
                        : confPercent >= 40
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}
                  >
                    {confPercent}% ({entry.hypothesisId})
                  </span>
                </div>
                <p className="text-white/80 text-[11px]">{entry.triggerEvent}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
