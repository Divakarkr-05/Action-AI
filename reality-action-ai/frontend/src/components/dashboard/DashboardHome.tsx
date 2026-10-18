import React from 'react';
import type { DiagnosticCase } from '../../types';
import {
  getGreeting,
  getDashboardCTA,
  formatCaseExpiry,
  getDiagnosticSteps,
  sortDiagnosticCases,
} from '../../utils/dashboardLogic';

export interface DashboardHomeProps {
  activeCase: DiagnosticCase | null;
  recentCases: DiagnosticCase[];
  onStartNewDiagnosis: () => void;
  onContinueCase: (c: DiagnosticCase) => void;
  onDeleteCase?: (caseId: string) => void;
  onOpenKnowledge: () => void;
  onOpenHistory: () => void;
  onOpenAllCases: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  activeCase,
  recentCases,
  onStartNewDiagnosis,
  onContinueCase,
  onDeleteCase,
  onOpenKnowledge,
  onOpenHistory,
  onOpenAllCases,
}) => {
  const greeting = getGreeting();
  const cta = getDashboardCTA(activeCase);
  const sortedRecent = sortDiagnosticCases(recentCases);

  const handlePrimaryCTAClick = () => {
    if (activeCase && cta.actionType !== 'START_NEW') {
      onContinueCase(activeCase);
    } else {
      onStartNewDiagnosis();
    }
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-6xl mx-auto">
      {/* ── 1. HERO SECTION ── */}
      <section className="bg-gradient-to-b from-graphite-900 to-graphite-950 border border-white/[0.08] rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Subtle background circuit grid */}
        <div className="absolute inset-0 bg-grid-fine opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-lime-400" />
            <span className="font-mono text-xs uppercase tracking-widest text-lime-400 font-semibold">
              AI Diagnostic Workspace
            </span>
          </div>

          <p className="font-sans text-xl text-white/60 mb-1">{greeting}</p>
          <h1 className="font-sans text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
            {cta.headline}
          </h1>

          <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-8 max-w-2xl font-light">
            {cta.subtext}
          </p>

          {/* Primary Action Button */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handlePrimaryCTAClick}
              className="btn-primary py-3.5 px-7 shadow-glow-lime flex items-center gap-3 cursor-pointer text-sm font-bold"
            >
              <span>⚡</span>
              <span>{cta.label}</span>
            </button>

            {recentCases.length > 0 && !activeCase && (
              <button
                onClick={() => onContinueCase(sortedRecent[0])}
                className="btn-ghost text-xs py-3 px-5 border-white/20"
              >
                Continue Recent Case ({sortedRecent[0].title})
              </button>
            )}

            <button
              onClick={onOpenKnowledge}
              className="btn-ghost text-xs py-3 px-5 text-white/50 hover:text-white"
            >
              Browse Failure Modes
            </button>
          </div>
        </div>

        {/* Supported input categories badge */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-wrap items-center gap-3 text-xs font-mono text-white/40">
          <span className="text-white/20 uppercase tracking-wider text-[10px]">
            Supported Inputs:
          </span>
          {['PCB', 'Component', 'Circuit', 'Machine', 'Diagram'].map((item) => (
            <span
              key={item}
              className="px-2.5 py-1 rounded-md bg-graphite-800 border border-white/[0.06] text-white/70"
            >
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ── 2. CURRENT ACTIVE CASE SPOTLIGHT (IF APPLICABLE) ── */}
      {activeCase && (
        <section className="bg-graphite-900 border-2 border-lime-400/30 rounded-2xl p-6 sm:p-7 shadow-xl shadow-lime-400/5 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-lime-400/20 text-lime-400 font-bold uppercase tracking-wider">
                  ACTIVE INVESTIGATION
                </span>
                <span className="text-white/40 font-mono text-xs">
                  {activeCase.domain}
                </span>
              </div>
              <h2 className="font-sans text-xl sm:text-2xl font-bold text-white">
                {activeCase.title}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
                ⏱️ {formatCaseExpiry(activeCase.expiresAt).text}
              </span>
              <button
                onClick={() => onContinueCase(activeCase)}
                className="btn-primary text-xs py-2 px-4"
              >
                Continue Case →
              </button>
            </div>
          </div>

          {/* 6-Phase Progress Stepper */}
          <div className="mb-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-3">
              Diagnostic Progress
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {getDiagnosticSteps(activeCase.currentState).map((step) => (
                <div
                  key={step.id}
                  className={`p-2 rounded-lg border text-center font-mono text-xs transition-all ${
                    step.status === 'COMPLETE'
                      ? 'bg-lime-400/10 border-lime-400/30 text-lime-400'
                      : step.status === 'CURRENT'
                      ? 'bg-graphite-800 border-lime-400 text-white font-bold ring-2 ring-lime-400/20'
                      : 'bg-graphite-950/40 border-white/[0.04] text-white/30'
                  }`}
                >
                  <div className="text-[11px] mb-0.5">
                    {step.status === 'COMPLETE' ? '✓' : step.status === 'CURRENT' ? '●' : '○'}
                  </div>
                  <div className="text-[10px] uppercase">{step.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Two-Column Grid: Hypothesis Breakdown & NEXT ACTION Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Hypotheses Snapshot */}
            <div className="bg-graphite-950/70 border border-white/[0.06] rounded-xl p-4 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase text-white/50 block mb-2 font-semibold">
                  Primary Leading Hypothesis
                </span>
                {activeCase.hypotheses.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-sm font-bold text-white">
                        {activeCase.hypotheses[0].title}
                      </span>
                      <span className="font-mono text-xs text-lime-400 font-bold">
                        {Math.round(activeCase.hypotheses[0].confidence * 100)}% Conf
                      </span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {activeCase.hypotheses[0].observedEvidence?.[0] || 'Observed physical evidence consistent with component degradation.'}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-white/40 font-mono">
                    Hypotheses being generated from visual inspection.
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-white/40">
                <span>Components Detected: {activeCase.identifiedComponents.length}</span>
                <span>Active Tests: {activeCase.activeTest ? '1 Ready' : '0'}</span>
              </div>
            </div>

            {/* NEXT ACTION Card */}
            <div className="bg-lime-400/[0.04] border border-lime-400/30 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400" />
                  <span className="font-mono text-[11px] uppercase tracking-wider text-lime-400 font-bold">
                    RECOMMENDED NEXT ACTION
                  </span>
                </div>

                <div className="font-mono text-sm font-semibold text-white mb-1.5">
                  {activeCase.activeTest
                    ? `Execute Test: ${activeCase.activeTest.title}`
                    : activeCase.currentState === 'REPAIR'
                    ? 'Begin Component Replacement & Repair'
                    : activeCase.currentState === 'VERIFY'
                    ? 'Upload Post-Repair Image for Verification'
                    : 'Inspect Component Area under Good Lighting'}
                </div>

                <div className="text-xs text-white/60 leading-relaxed">
                  <span className="text-lime-400/90 font-medium font-mono">Why? </span>
                  {activeCase.activeTest
                    ? activeCase.activeTest.whyThisTest
                    : 'To verify physical integrity and isolate root cause safely.'}
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-end">
                <button
                  onClick={() => onContinueCase(activeCase)}
                  className="px-4 py-2 rounded-lg bg-lime-400 text-black font-mono text-xs font-bold hover:bg-lime-300 transition-colors cursor-pointer"
                >
                  View Action & Instructions →
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. RECENT DIAGNOSTIC CASES SECTION ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-sm uppercase tracking-wider text-white font-bold flex items-center gap-2">
              <span>🗂️</span>
              <span>Recent Diagnostic Cases (7-Day Retention)</span>
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Cases are automatically saved for 7 days so you can test, source parts, and verify fixes.
            </p>
          </div>

          {recentCases.length > 4 && (
            <button
              onClick={onOpenAllCases}
              className="text-xs font-mono text-lime-400/80 hover:text-lime-400 transition-colors"
            >
              View All ({recentCases.length}) →
            </button>
          )}
        </div>

        {recentCases.length === 0 ? (
          <div className="bg-graphite-900 border border-white/[0.08] rounded-xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-graphite-800 border border-white/[0.06] mx-auto flex items-center justify-center text-xl">
              🔍
            </div>
            <div className="font-mono text-sm text-white/80 font-semibold">
              No diagnostic cases yet.
            </div>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Upload your first PCB, component, or machine image to start a guided, safe investigation.
            </p>
            <div className="pt-2">
              <button
                onClick={onStartNewDiagnosis}
                className="btn-primary text-xs py-2 px-5"
              >
                + Start Diagnosis
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRecent.slice(0, 6).map((c) => {
              const expiry = formatCaseExpiry(c.expiresAt);
              const isCaseResolved = c.currentState === 'RESOLVED';
              return (
                <div
                  key={c.id}
                  className="bg-graphite-900 border border-white/[0.08] hover:border-lime-400/40 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-lg"
                >
                  <div>
                    {/* Header: Domain & Expiry */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-white/60 uppercase">
                        {c.domain}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          expiry.isUrgent
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-white/[0.04] text-white/40'
                        }`}
                      >
                        ⏱️ {expiry.text}
                      </span>
                    </div>

                    {/* Case Title */}
                    <h3 className="font-mono text-sm font-bold text-white group-hover:text-lime-400 transition-colors line-clamp-1 mb-1.5">
                      {c.title}
                    </h3>

                    {/* Status Pill */}
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isCaseResolved
                            ? 'bg-emerald-400'
                            : c.currentState === 'AWAITING_TEST'
                            ? 'bg-amber-400 animate-pulse'
                            : 'bg-lime-400'
                        }`}
                      />
                      <span className="font-mono text-[11px] text-white/70 uppercase">
                        {c.currentState.replace(/_/g, ' ')}
                      </span>
                      <span className="text-white/30 text-[10px]">·</span>
                      <span className="font-mono text-[11px] text-lime-400 font-semibold">
                        {Math.round(c.investigationProgress * 100)}%
                      </span>
                    </div>

                    {/* Case Meta Stats */}
                    <div className="text-[11px] font-mono text-white/40 space-y-1 mb-4">
                      <div>
                        {c.faultBoxes.length} suspected fault{c.faultBoxes.length === 1 ? '' : 's'} ·{' '}
                        {c.activeTest ? '1 test pending' : 'No pending tests'}
                      </div>
                      <div>
                        Updated: {new Date(c.updatedAt || c.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
                    <button
                      onClick={() => onContinueCase(c)}
                      className="text-xs font-mono font-bold text-lime-400 hover:text-lime-300 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Continue Diagnosis</span>
                      <span>→</span>
                    </button>

                    {onDeleteCase && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete case "${c.title}"?`)) {
                            onDeleteCase(c.id);
                          }
                        }}
                        className="text-white/30 hover:text-red-400 text-xs font-mono transition-colors p-1"
                        title="Delete case now"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 4. QUICK ACTIONS & GUIDES ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
        <button
          onClick={onStartNewDiagnosis}
          className="p-4 rounded-xl bg-graphite-900 border border-white/[0.06] hover:border-lime-400/40 text-left transition-all group cursor-pointer"
        >
          <span className="text-xl block mb-2">⚡</span>
          <div className="font-mono text-xs font-bold text-white group-hover:text-lime-400 transition-colors uppercase">
            New Diagnosis
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Capture or drop any electronic board for instant visual fault mapping.
          </p>
        </button>

        <button
          onClick={onOpenKnowledge}
          className="p-4 rounded-xl bg-graphite-900 border border-white/[0.06] hover:border-lime-400/40 text-left transition-all group cursor-pointer"
        >
          <span className="text-xl block mb-2">📚</span>
          <div className="font-mono text-xs font-bold text-white group-hover:text-lime-400 transition-colors uppercase">
            Failure Mode Guide
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Visual library and multimeter test protocols for capacitors, diodes, and ICs.
          </p>
        </button>

        <button
          onClick={onOpenHistory}
          className="p-4 rounded-xl bg-graphite-900 border border-white/[0.06] hover:border-lime-400/40 text-left transition-all group cursor-pointer"
        >
          <span className="text-xl block mb-2">⏱️</span>
          <div className="font-mono text-xs font-bold text-white group-hover:text-lime-400 transition-colors uppercase">
            Analysis History
          </div>
          <p className="text-[11px] text-white/40 mt-1">
            Review permanently saved diagnostic cases, verified repairs, and notes.
          </p>
        </button>
      </section>
    </div>
  );
};
