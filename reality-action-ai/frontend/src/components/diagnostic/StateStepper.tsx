import React, { useState } from 'react';
import type { DiagnosticState } from '../../types';

interface StateStepperProps {
  currentState: DiagnosticState;
  investigationProgress: number;
}

const ORDERED_STATES: { key: DiagnosticState; label: string; icon: string }[] = [
  { key: 'OBSERVE', label: 'Observe', icon: '👁' },
  { key: 'IDENTIFY', label: 'Identify', icon: '🔍' },
  { key: 'HYPOTHESIZE', label: 'Hypothesize', icon: '🌳' },
  { key: 'SAFETY_CHECK', label: 'Safety', icon: '⚡' },
  { key: 'TEST_TO_KNOW', label: 'Test Plan', icon: '📋' },
  { key: 'AWAITING_TEST', label: 'Run Test', icon: '🧪' },
  { key: 'INTERPRET_RESULT', label: 'Interpret', icon: '📊' },
  { key: 'NEXT_ACTION', label: 'Action', icon: '🎯' },
  { key: 'REPAIR', label: 'Repair', icon: '🔧' },
  { key: 'VERIFY', label: 'Verify', icon: '✨' },
  { key: 'RESOLVED', label: 'Resolved', icon: '✅' },
];

interface CompactStage {
  id: string;
  label: string;
  states: DiagnosticState[];
}

const COMPACT_STAGES: CompactStage[] = [
  { id: 'OBSERVE', label: 'OBSERVE', states: ['OBSERVE'] },
  { id: 'IDENTIFY', label: 'IDENTIFY', states: ['IDENTIFY'] },
  { id: 'HYPOTHESIZE', label: 'HYPOTHESIZE', states: ['HYPOTHESIZE'] },
  { id: 'SAFETY', label: 'SAFETY', states: ['SAFETY_CHECK'] },
  { id: 'TEST', label: 'TEST', states: ['TEST_TO_KNOW', 'AWAITING_TEST', 'INTERPRET_RESULT', 'NEXT_ACTION'] },
  { id: 'REPAIR', label: 'REPAIR', states: ['REPAIR'] },
  { id: 'VERIFY', label: 'VERIFY', states: ['VERIFY', 'RESOLVED'] },
];

export const StateStepper: React.FC<StateStepperProps> = ({
  currentState,
  investigationProgress,
}) => {
  const [showAllStages, setShowAllStages] = useState(false);
  const currentIndex = ORDERED_STATES.findIndex((s) => s.key === currentState);
  const currentStepNum = currentIndex >= 0 ? currentIndex + 1 : 1;

  // Active compact stage index
  const activeCompactIdx = COMPACT_STAGES.findIndex((stage) =>
    stage.states.includes(currentState),
  );

  return (
    <div className="w-full bg-graphite-900 border border-white/[0.08] rounded-xl px-4 py-3 shadow-lg transition-all">
      {/* Header row: Compact step number + progress bar + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse flex-shrink-0" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            Step {currentStepNum} of 11
          </span>
          <span className="text-white/20">|</span>
          <span className="font-mono text-[11px] text-lime-400 font-semibold bg-lime-400/10 px-2 py-0.5 rounded border border-lime-400/20">
            {currentState.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-24 bg-graphite-800 rounded-full h-1.5 overflow-hidden border border-white/[0.05]">
            <div
              className="bg-lime-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.round(investigationProgress * 100)}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-white/50">
            {Math.round(investigationProgress * 100)}%
          </span>
          <button
            onClick={() => setShowAllStages(!showAllStages)}
            className="text-[11px] font-mono text-white/50 hover:text-lime-400 transition-colors cursor-pointer ml-1"
          >
            {showAllStages ? '[Hide investigation stages]' : '[View investigation stages]'}
          </button>
        </div>
      </div>

      {/* Primary Compact Horizontal Stepper */}
      <div className="flex items-center justify-between overflow-x-auto py-2.5 px-1 scrollbar-none gap-1 sm:gap-2">
        {COMPACT_STAGES.map((stage, idx) => {
          const isDone = idx < activeCompactIdx || currentState === 'RESOLVED';
          const isCurrent = idx === activeCompactIdx && currentState !== 'RESOLVED';

          return (
            <React.Fragment key={stage.id}>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all duration-200 whitespace-nowrap select-none ${
                  isCurrent
                    ? 'bg-lime-400 text-black font-bold shadow-md shadow-lime-400/20 scale-105'
                    : isDone
                    ? 'text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-white/40 bg-white/[0.02] border border-transparent'
                }`}
              >
                {isDone && <span className="text-[10px]">✓</span>}
                {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />}
                <span>{stage.label}</span>
              </div>
              {idx < COMPACT_STAGES.length - 1 && (
                <span className="text-white/20 font-mono text-xs select-none">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Collapsible 11-State Detail View */}
      {showAllStages && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] animate-fade-in">
          <div className="relative flex items-center justify-between overflow-x-auto py-2 px-1 scrollbar-thin">
            <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-white/[0.06] -z-0" />
            {ORDERED_STATES.map((step, idx) => {
              const isDone = idx < currentIndex || currentState === 'RESOLVED';
              const isCurrent = step.key === currentState && currentState !== 'RESOLVED';

              return (
                <div
                  key={step.key}
                  className="relative z-10 flex flex-col items-center min-w-[65px] group cursor-default"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono transition-all duration-300 ${
                      isCurrent
                        ? 'bg-lime-400 text-black font-bold ring-2 ring-lime-400/30 shadow-md scale-110'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-graphite-800 text-white/30 border border-white/[0.06]'
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span
                    className={`mt-1 text-[9px] font-mono tracking-tight transition-colors ${
                      isCurrent
                        ? 'text-lime-400 font-bold'
                        : isDone
                        ? 'text-emerald-400/70'
                        : 'text-white/30'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
