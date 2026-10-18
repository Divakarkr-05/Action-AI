import React, { useState } from 'react';
import type { EvidenceItem, EvidenceType } from '../../types';

interface EvidencePanelProps {
  evidence: EvidenceItem[];
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence }) => {
  const [activeTab, setActiveTab] = useState<EvidenceType | 'ALL'>('ALL');

  const observed = evidence.filter((e) => e.evidenceType === 'OBSERVED');
  const inferred = evidence.filter((e) => e.evidenceType === 'INFERRED');
  const unknown = evidence.filter((e) => e.evidenceType === 'UNKNOWN');

  const filtered =
    activeTab === 'ALL'
      ? evidence
      : evidence.filter((e) => e.evidenceType === activeTab);

  const getBadgeClass = (type: EvidenceType) => {
    switch (type) {
      case 'OBSERVED':
        return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30';
      case 'INFERRED':
        return 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30';
      case 'UNKNOWN':
        return 'bg-purple-400/10 text-purple-400 border-purple-400/30';
    }
  };

  return (
    <div className="bg-graphite-900 border border-white/[0.08] rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-white/90 font-bold">
            EPISTEMIC EVIDENCE CLASSIFICATION
          </span>
          <span className="text-[10px] font-mono text-white/40">
            ({evidence.length} claims)
          </span>
        </div>

        {/* Epistemic Tabs */}
        <div className="flex items-center gap-1 bg-graphite-800/80 p-0.5 rounded-lg border border-white/[0.04]">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
              activeTab === 'ALL'
                ? 'bg-lime-400 text-black font-bold'
                : 'text-white/50 hover:text-white'
            }`}
          >
            ALL
          </button>
          <button
            onClick={() => setActiveTab('OBSERVED')}
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
              activeTab === 'OBSERVED'
                ? 'bg-emerald-400 text-black font-bold'
                : 'text-emerald-400/70 hover:text-emerald-400'
            }`}
          >
            OBSERVED ({observed.length})
          </button>
          <button
            onClick={() => setActiveTab('INFERRED')}
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
              activeTab === 'INFERRED'
                ? 'bg-cyan-400 text-black font-bold'
                : 'text-cyan-400/70 hover:text-cyan-400'
            }`}
          >
            INFERRED ({inferred.length})
          </button>
          <button
            onClick={() => setActiveTab('UNKNOWN')}
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
              activeTab === 'UNKNOWN'
                ? 'bg-purple-400 text-black font-bold'
                : 'text-purple-400/70 hover:text-purple-400'
            }`}
          >
            UNKNOWN ({unknown.length})
          </button>
        </div>
      </div>

      {/* Strict Anti-Fabrication Notice */}
      <div className="text-[11px] font-mono text-white/40 mb-3 flex items-center gap-2">
        <span>🛡️ Grounded Truth:</span>
        <span className="text-emerald-400/80">Observed = Physical fact</span>
        <span>·</span>
        <span className="text-cyan-400/80">Inferred = Technical deduction</span>
        <span>·</span>
        <span className="text-purple-400/80">Unknown = Unmeasured quantity</span>
      </div>

      {/* Evidence Items List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="p-2.5 rounded-lg bg-graphite-950/60 border border-white/[0.04] flex items-start justify-between gap-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${getBadgeClass(
                    item.evidenceType,
                  )}`}
                >
                  {item.evidenceType}
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  SRC: {item.provenance}
                </span>
              </div>
              <p className="text-xs font-mono text-white/90 leading-relaxed">
                {item.claim}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono font-bold text-lime-400">
                {Math.round(item.confidence * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
