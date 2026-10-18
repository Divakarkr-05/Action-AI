import React, { useState } from 'react';
import type { Hypothesis, HypothesisStatus } from '../../types';

interface HypothesisTreeProps {
  hypotheses: Hypothesis[];
}

export const HypothesisTree: React.FC<HypothesisTreeProps> = ({ hypotheses }) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    hypotheses.length > 0 ? hypotheses[0].id : null,
  );

  const getStatusBadge = (status: HypothesisStatus) => {
    switch (status) {
      case 'SUPPORTED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'WEAKENED':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'REFUTED':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'RESOLVED':
        return 'bg-lime-400/20 text-lime-400 border-lime-400/40';
      default:
        return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  return (
    <div className="bg-graphite-900 border border-white/[0.08] rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-white/90 font-bold">
            COMPETING HYPOTHESIS TREE
          </span>
          <span className="text-[10px] font-mono text-white/40">
            ({hypotheses.length} active branches)
          </span>
        </div>
        <span className="text-[10px] font-mono text-lime-400/70">
          Anti-Confirmation Bias Active
        </span>
      </div>

      <div className="space-y-3">
        {hypotheses.map((hypo) => {
          const isExpanded = expandedId === hypo.id;
          const confPercent = Math.round(hypo.confidence * 100);

          return (
            <div
              key={hypo.id}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? 'bg-graphite-950/80 border-white/20'
                  : 'bg-graphite-950/40 border-white/[0.06] hover:border-white/10'
              }`}
            >
              {/* Header bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : hypo.id)}
                className="p-3 cursor-pointer flex items-center justify-between gap-3 select-none"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="font-mono text-xs font-bold text-lime-400 shrink-0">
                    {hypo.id}
                  </span>
                  <span className="font-mono text-xs text-white/90 truncate font-semibold">
                    {hypo.title}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Confidence Pill */}
                  <div className="w-16 bg-graphite-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        confPercent >= 70
                          ? 'bg-emerald-400'
                          : confPercent >= 40
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${confPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-white/80 min-w-[32px] text-right">
                    {confPercent}%
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${getStatusBadge(
                      hypo.status,
                    )}`}
                  >
                    {hypo.status}
                  </span>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-white/[0.04] space-y-3 font-mono text-[11px] animate-fade-in">
                  {/* Disconfirming evidence card (Phase 9 - "What would prove me wrong?") */}
                  <div className="bg-amber-950/20 border border-amber-400/20 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                      <span>⚖️</span>
                      <span>WHAT WOULD PROVE THIS WRONG? (DISCONFIRMING CRITERIA)</span>
                    </div>
                    <ul className="list-disc list-inside text-white/80 space-y-1">
                      {hypo.disconfirmingEvidence.map((crit, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {crit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Supporting evidence */}
                  {hypo.supportingEvidence.length > 0 && (
                    <div>
                      <span className="text-white/40 block mb-1">SUPPORTING EVIDENCE:</span>
                      <ul className="list-disc list-inside text-white/70 space-y-0.5">
                        {hypo.supportingEvidence.map((sup, idx) => (
                          <li key={idx}>{sup}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Affected components */}
                  {hypo.affectedComponents.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                      <span className="text-white/40">AFFECTED COMPONENTS:</span>
                      <div className="flex flex-wrap gap-1">
                        {hypo.affectedComponents.map((comp, idx) => (
                          <span
                            key={idx}
                            className="bg-white/[0.05] border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-white/80"
                          >
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
