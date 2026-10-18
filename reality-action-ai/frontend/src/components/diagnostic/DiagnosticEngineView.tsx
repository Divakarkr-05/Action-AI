import React, { useState } from 'react';
import type {
  DiagnosticCase,
  FaultBox,
} from '../../types';
import { StateStepper } from './StateStepper';
import { DiagnosticFaultMap } from './DiagnosticFaultMap';
import { EvidencePanel } from './EvidencePanel';
import { HypothesisTree } from './HypothesisTree';
import { TestToKnowCard } from './TestToKnowCard';
import { RepairPlanPanel } from './RepairPlanPanel';
import { ConfidenceTimeline } from './ConfidenceTimeline';
import { useAIProviderStatus } from '../../hooks/useAIProviderStatus';
import { formatCaseExpiry } from '../../utils/dashboardLogic';
import { normalizeDiagnostic, type NormalizedFault } from '../../utils/normalizeDiagnostic';

interface DiagnosticEngineViewProps {
  diagnosticCase: DiagnosticCase;
  currentImageUrl?: string;
  onNewAnalysis: () => void;
  onSubmitTestResult: (params: {
    resultType: 'NUMERIC' | 'TEXT' | 'CHOICE';
    numericValue?: number;
    unit?: string;
    textValue?: string;
    notes?: string;
  }) => void;
  onVerifyRepair: (afterImageBase64: string) => void;
  isSubmittingTest: boolean;
  isVerifyingRepair: boolean;
  onOpenRecentCases?: () => void;
}

export const DiagnosticEngineView: React.FC<DiagnosticEngineViewProps> = ({
  diagnosticCase,
  currentImageUrl,
  onNewAnalysis,
  onSubmitTestResult,
  onVerifyRepair,
  isSubmittingTest,
  isVerifyingRepair,
  onOpenRecentCases,
}) => {
  const aiStatus = useAIProviderStatus();

  const effectiveImageUrl =
    diagnosticCase.latestImageUrl ||
    diagnosticCase.initialImageUrl ||
    currentImageUrl ||
    '';

  // Normalized Canonical Diagnostic Model (Single source of truth & deduplication)
  const {
    faults: normalizedFaults,
    primaryFault: defaultPrimaryFault,
    activeComponent,
    observedEvidence,
    inferredEvidence,
    unknownEvidence,
  } = normalizeDiagnostic(diagnosticCase);

  // Selected visual fault box (defaults to primary fault id or null)
  const [selectedFaultId, setSelectedFaultId] = useState<string | null>(
    defaultPrimaryFault ? defaultPrimaryFault.id : null,
  );

  // Active canonical fault
  const activeFault: NormalizedFault | null =
    normalizedFaults.find((f) => f.id === selectedFaultId) ||
    defaultPrimaryFault ||
    (normalizedFaults.length > 0 ? normalizedFaults[0] : null);

  // Safety checklist states
  const [powerDisconnected, setPowerDisconnected] = useState(false);
  const [componentDischarged, setComponentDischarged] = useState(false);
  const [isSafetyConfirmed, setIsSafetyConfirmed] = useState(false);

  // Quick measurement test inputs
  const [numericValue, setNumericValue] = useState<string>('120');
  const [unit, setUnit] = useState<string>('µF');
  const [testNotes, setTestNotes] = useState<string>('');

  // Local state override for test interaction flow
  const [isTestInputActive, setIsTestInputActive] = useState(
    diagnosticCase.currentState === 'AWAITING_TEST',
  );

  // Accordion collapsible states (all collapsed by default per requirements)
  const [openSections, setOpenSections] = useState<{
    evidenceDetails: boolean;
    whyThisTest: boolean;
    cameraGuidance: boolean;
    history: boolean;
    repairProtocol: boolean;
    grounding: boolean;
    hypothesisTree: boolean;
  }>({
    evidenceDetails: false,
    whyThisTest: false,
    cameraGuidance: false,
    history: false,
    repairProtocol: false,
    grounding: false,
    hypothesisTree: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expiry = formatCaseExpiry(diagnosticCase.expiresAt);

  // Safety required check
  const hasSafetyWarning =
    (diagnosticCase.activeTest?.safetyWarnings &&
      diagnosticCase.activeTest.safetyWarnings.length > 0) ||
    diagnosticCase.currentState === 'SAFETY_CHECK';

  // Handle measurement submit
  const handleTestSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(numericValue);
    if (isNaN(val)) return;

    onSubmitTestResult({
      resultType: 'NUMERIC',
      numericValue: val,
      unit,
      notes: testNotes || 'Physical measurement entered by technician.',
    });
  };

  // Preset fills for fast technician entry
  const handleQuickFill = (val: number, u: string, note: string) => {
    setNumericValue(val.toString());
    setUnit(u);
    setTestNotes(note);
    onSubmitTestResult({
      resultType: 'NUMERIC',
      numericValue: val,
      unit: u,
      notes: note,
    });
  };

  // Determine current active hypotheses sorted by confidence
  const sortedHypotheses = [...diagnosticCase.hypotheses].sort(
    (a, b) => b.confidence - a.confidence,
  );

  // Severity color helper
  const getSeverityBadge = (sev?: string) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'INFO':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-400/30';
      default:
        return 'bg-white/10 text-white/70 border-white/20';
    }
  };

  return (
    <div className="w-full space-y-5 animate-fade-in text-white">
      {/* ========================================================= */}
      {/* 1. HEADER: ← Dashboard | Case Title | SARVAM CONNECTED | [Cases] */}
      {/* ========================================================= */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-graphite-900 border border-white/[0.08] rounded-xl px-4 sm:px-5 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onNewAnalysis}
            className="flex items-center gap-1.5 text-white/60 hover:text-lime-400 font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer"
            title="Return to Dashboard / New Diagnosis"
          >
            <span>←</span>
            <span>Dashboard</span>
          </button>
          <span className="text-white/20">|</span>
          <div className="font-mono text-xs flex items-center gap-2">
            <span className="text-white font-bold tracking-wide">
              {diagnosticCase.title || 'Diagnostic Case'}
            </span>
            <span className="text-[10px] text-white/40 hidden md:inline">
              [{diagnosticCase.domain}]
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* PRIMARY CONNECTION BADGE: Dynamically shows active provider (SARVAM CONNECTED), NEVER Gemma 4 */}
          <div
            className="flex items-center gap-2 bg-graphite-950 border border-white/[0.08] rounded-full px-3 py-1 cursor-default select-none shadow-sm"
            title={aiStatus.tooltipText}
          >
            <span className={`status-dot ${aiStatus.dotClass}`} />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/80 font-bold">
              {aiStatus.badgeText}
            </span>
          </div>

          {/* Expiry Pill */}
          <div
            className={`flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full border ${
              expiry.isUrgent
                ? 'bg-amber-400/10 border-amber-400/30 text-amber-400'
                : 'bg-white/[0.04] border-white/10 text-white/50'
            }`}
          >
            <span>⏱️</span>
            <span>{expiry.text}</span>
          </div>

          {/* Cases Drawer Trigger */}
          {onOpenRecentCases && (
            <button
              onClick={onOpenRecentCases}
              className="px-2.5 py-1 text-[11px] font-mono text-white/70 hover:text-lime-400 border border-white/[0.08] hover:border-lime-400/40 rounded-lg bg-graphite-800 transition-colors cursor-pointer"
            >
              [Cases]
            </button>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. COMPACT DIAGNOSTIC PROGRESS STEPPER */}
      {/* ========================================================= */}
      <StateStepper
        currentState={diagnosticCase.currentState}
        investigationProgress={diagnosticCase.investigationProgress}
      />

      {/* Camera Coach Alert (Only shown if additional visual evidence is strictly required) */}
      {diagnosticCase.imageQuality?.overall === 'NEEDS_BETTER_IMAGE' && diagnosticCase.cameraCoach && (
        <div className="bg-amber-950/40 border-2 border-amber-400/50 rounded-xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse-slow">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
              <span>📷</span>
              <span>MORE EVIDENCE NEEDED</span>
            </div>
            <p className="text-xs font-mono text-amber-200/90">
              <span className="font-semibold text-white">Target: </span>
              {diagnosticCase.cameraCoach.target} ·{' '}
              <span className="font-semibold text-white">Distance: </span>
              {diagnosticCase.cameraCoach.howClose} ·{' '}
              <span className="font-semibold text-white">Angle: </span>
              {diagnosticCase.cameraCoach.whatAngle}
            </p>
          </div>
          <button
            onClick={onNewAnalysis}
            className="btn-primary text-xs py-2 px-4 whitespace-nowrap self-start sm:self-auto"
          >
            TAKE PHOTO
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. PRIMARY DIAGNOSIS SUMMARY (VISUAL FAULT) — TOP SECTION  */}
      {/* Single canonical source of truth for the primary diagnosis */}
      {/* ========================================================= */}
      {activeFault && (
        <section className="bg-graphite-900 border border-white/[0.08] rounded-xl p-5 shadow-xl space-y-3.5">
          {/* Header: 📍 VISUAL FAULT + Severity + Single Explicit Confidence */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base text-lime-400">📍</span>
              <span className="font-mono text-xs uppercase tracking-wider text-lime-400 font-bold">
                VISUAL FAULT
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border uppercase ${getSeverityBadge(
                  activeFault.severity,
                )}`}
              >
                {activeFault.severity}
              </span>
              <span className="text-[11px] font-mono text-lime-400 font-bold bg-lime-400/10 px-2.5 py-0.5 rounded border border-lime-400/30">
                {Math.round(activeFault.confidence * 100)}% confidence
              </span>
            </div>
          </div>

          {/* Primary Fault Identity */}
          <div>
            <h2 className="font-mono text-base sm:text-lg font-bold text-white tracking-wide">
              {activeFault.reference_designator} — {activeFault.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-white/60 mt-1">
              <span>{activeFault.component}</span>
              {activeComponent?.marking && (
                <>
                  <span>·</span>
                  <span className="text-white/80">{activeComponent.marking}</span>
                </>
              )}
              {activeFault.identity_confidence !== undefined && (
                <>
                  <span>·</span>
                  <span className="text-white/40">
                    Identity confidence: {Math.round(activeFault.identity_confidence * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Fault selector tabs (Shown only if multiple distinct faults exist) */}
          {normalizedFaults.length > 1 && (
            <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04] overflow-x-auto">
              <span className="text-[10px] font-mono text-white/40 uppercase">Faults:</span>
              {normalizedFaults.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFaultId(f.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer border ${
                    f.id === activeFault.id
                      ? 'bg-lime-400 text-black font-bold border-lime-400'
                      : 'bg-graphite-950/70 text-white/70 border-white/10 hover:border-white/30'
                  }`}
                >
                  {f.reference_designator} ({f.severity})
                </button>
              ))}
            </div>
          )}

          {/* Epistemic Structured Details inside Primary Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/[0.06] text-xs font-mono">
            {/* Observed Physical Evidence */}
            <div className="p-3 rounded-lg bg-graphite-950/70 border border-emerald-500/20 space-y-1.5">
              <span className="text-emerald-400 font-bold block uppercase text-[10px]">
                Observed:
              </span>
              <ul className="space-y-1 text-white/90">
                {activeFault.observed_evidence.length > 0 ? (
                  activeFault.observed_evidence.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-white/40 italic">Visual evidence documented</li>
                )}
              </ul>
            </div>

            {/* Inferred Deduction */}
            <div className="p-3 rounded-lg bg-graphite-950/70 border border-cyan-500/20 space-y-1.5">
              <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                Inferred:
              </span>
              <p className="text-white/80 leading-relaxed">
                {activeFault.inferred_diagnosis}
              </p>
            </div>

            {/* Next Recommended Physical Inspection */}
            <div className="p-3 rounded-lg bg-graphite-950/70 border border-lime-400/20 space-y-1.5">
              <span className="text-lime-400 font-bold block uppercase text-[10px]">
                Next:
              </span>
              <p className="text-white/80 leading-relaxed">
                {activeFault.next_inspection || 'Inspect underside PCB traces and verify adjacent circuit paths.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* 4. WORKSTATION LAYOUT (DESKTOP: 3-COL / MOBILE: ORDERED)  */}
      {/* Desktop: LEFT = Fault Map | CENTER = Evidence + Hypotheses | RIGHT = Safety + Next Action */}
      {/* Mobile Single-Column Order: 1.Diagnosis -> 2.Fault Map -> 3.Evidence -> 4.Hypotheses -> 5.Safety -> 6.Test -> 7.Next Action */}
      {/* ========================================================= */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ------------------------------------------------------- */}
        {/* COLUMN 1: LEFT (lg:col-span-4): SPATIAL FAULT MAP       */}
        {/* ------------------------------------------------------- */}
        <section className="lg:col-span-4 space-y-4">
          <div className="bg-graphite-900 border border-white/[0.08] rounded-xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base text-cyan-400">🗺️</span>
                <h3 className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                  FAULT LOCATION
                </h3>
              </div>
              <span className="text-[10px] font-mono text-white/40">
                Spatial Map
              </span>
            </div>

            {/* Interactive Spatial Fault Map (Does NOT duplicate diagnosis card) */}
            <DiagnosticFaultMap
              imageUrl={effectiveImageUrl}
              faults={
                normalizedFaults
                  .map((nf) => nf.rawFaultBox)
                  .filter((fb): fb is FaultBox => Boolean(fb))
              }
              selectedFaultId={selectedFaultId}
              onSelectFault={setSelectedFaultId}
              cameraCoach={diagnosticCase.cameraCoach}
              imageQuality={diagnosticCase.imageQuality}
            />
          </div>
        </section>

        {/* ------------------------------------------------------- */}
        {/* COLUMN 2: CENTER (lg:col-span-4): EVIDENCE + HYPOTHESES */}
        {/* ------------------------------------------------------- */}
        <section className="lg:col-span-4 space-y-4">
          {/* A. EVIDENCE SUMMARY (WHAT WE KNOW) */}
          <div className="bg-graphite-900 border border-white/[0.08] rounded-xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base text-cyan-400">📋</span>
                <h3 className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                  EVIDENCE
                </h3>
              </div>
              <span className="text-[10px] font-mono text-white/40">
                Grounded Truth
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              {/* OBSERVED */}
              <div className="p-3 rounded-lg bg-graphite-950/80 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[10px]">
                  <span>✓</span>
                  <span>OBSERVED</span>
                </div>
                <ul className="text-white/80 space-y-1 leading-relaxed">
                  {observedEvidence.length > 0 ? (
                    observedEvidence.map((claim, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 shrink-0 mt-0.5">•</span>
                        <span>{claim}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-white/40 italic">Visual observations grounded</li>
                  )}
                </ul>
              </div>

              {/* INFERRED */}
              <div className="p-3 rounded-lg bg-graphite-950/80 border border-cyan-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase text-[10px]">
                  <span>→</span>
                  <span>INFERRED</span>
                </div>
                <ul className="text-white/80 space-y-1 leading-relaxed">
                  {inferredEvidence.length > 0 ? (
                    inferredEvidence.map((claim, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-cyan-400 shrink-0 mt-0.5">•</span>
                        <span>{claim}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-white/40 italic">Technical deduction recorded</li>
                  )}
                </ul>
              </div>

              {/* UNKNOWN */}
              <div className="p-3 rounded-lg bg-graphite-950/80 border border-purple-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold uppercase text-[10px]">
                  <span>?</span>
                  <span>UNKNOWN</span>
                </div>
                <ul className="text-white/80 space-y-1 leading-relaxed">
                  {unknownEvidence.length > 0 ? (
                    unknownEvidence.map((claim, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-purple-400 shrink-0 mt-0.5">•</span>
                        <span>{claim}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-white/40 italic">Unknown quantities to test</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* B. HYPOTHESES (ALTERNATIVE EXPLANATIONS) */}
          <div className="bg-graphite-900 border border-white/[0.08] rounded-xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base text-lime-400">🌳</span>
                <h3 className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                  HYPOTHESES
                </h3>
              </div>
              <span className="text-[10px] font-mono text-lime-400/70">
                Anti-Confirmation Bias
              </span>
            </div>

            <div className="space-y-2">
              {sortedHypotheses.map((h) => {
                const pct = Math.round(h.confidence * 100);
                return (
                  <div
                    key={h.id}
                    className="p-3 rounded-lg bg-graphite-950/70 border border-white/[0.06] flex items-center justify-between gap-2 hover:border-white/20 transition-all font-mono text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-bold text-lime-400 shrink-0">{h.id}</span>
                      <span className="text-white/90 truncate font-medium">{h.title}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-14 bg-graphite-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            pct >= 70
                              ? 'bg-lime-400'
                              : pct >= 40
                              ? 'bg-cyan-400'
                              : 'bg-white/30'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-bold text-white min-w-[28px] text-right">
                        {pct}%
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                          h.status === 'SUPPORTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : h.status === 'WEAKENED'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-white/10 text-white/70 border-white/10'
                        }`}
                      >
                        {h.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- */}
        {/* COLUMN 3: RIGHT (lg:col-span-4): SAFETY + NEXT ACTION   */}
        {/* ------------------------------------------------------- */}
        <section className="lg:col-span-4 space-y-4">
          {/* ===================================================== */}
          {/* A. SAFETY CHECK REQUIRED (VISUALLY OVERRIDES NORMAL CONTENT) */}
          {/* ===================================================== */}
          {hasSafetyWarning && !isSafetyConfirmed && (
            <div className="bg-amber-950/40 border-2 border-amber-400 rounded-xl p-5 shadow-2xl space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                <span className="text-xl animate-pulse">⚠️</span>
                <span>SAFETY CHECK REQUIRED</span>
              </div>

              <div className="text-xs font-mono text-amber-200/90 leading-relaxed bg-black/40 p-3 rounded border border-amber-400/20">
                Ensure device is disconnected from mains and components are discharged before testing.
              </div>

              {/* Safety Confirmation Checkboxes */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-3 p-2.5 rounded bg-graphite-950/80 border border-amber-400/30 text-xs font-mono text-white cursor-pointer select-none hover:bg-black/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={powerDisconnected}
                    onChange={(e) => setPowerDisconnected(e.target.checked)}
                    className="w-4 h-4 accent-lime-400 rounded cursor-pointer"
                  />
                  <span>Power is disconnected</span>
                </label>

                <label className="flex items-center gap-3 p-2.5 rounded bg-graphite-950/80 border border-amber-400/30 text-xs font-mono text-white cursor-pointer select-none hover:bg-black/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={componentDischarged}
                    onChange={(e) => setComponentDischarged(e.target.checked)}
                    className="w-4 h-4 accent-lime-400 rounded cursor-pointer"
                  />
                  <span>Component is safely discharged</span>
                </label>
              </div>

              {/* PRIMARY CTA: I CONFIRM - CONTINUE */}
              <button
                disabled={!powerDisconnected || !componentDischarged}
                onClick={() => setIsSafetyConfirmed(true)}
                className={`w-full py-3 px-4 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-lg ${
                  powerDisconnected && componentDischarged
                    ? 'bg-lime-400 text-black hover:bg-lime-300 cursor-pointer shadow-lime-400/20'
                    : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
                }`}
              >
                I CONFIRM — CONTINUE →
              </button>
            </div>
          )}

          {/* ===================================================== */}
          {/* B. PRIMARY DOMINANT NEXT ACTION / TEST-TO-KNOW CARD   */}
          {/* ===================================================== */}
          {(!hasSafetyWarning || isSafetyConfirmed) && (
            <div className="bg-lime-400/[0.04] border-2 border-lime-400/40 rounded-xl p-5 shadow-2xl space-y-4">
              {/* Header: ⚡ NEXT ACTION */}
              <div className="flex items-center justify-between border-b border-lime-400/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base text-lime-400 animate-pulse">⚡</span>
                  <span className="font-mono text-xs uppercase tracking-wider text-lime-400 font-bold">
                    NEXT ACTION
                  </span>
                </div>
                <span className="text-[10px] font-mono text-white/50 uppercase">
                  {diagnosticCase.currentState.replace(/_/g, ' ')}
                </span>
              </div>

              {/* ------------------------------------------------- */}
              {/* STATE 1: TEST_TO_KNOW (Answers: WHAT UNKNOWN ARE WE RESOLVING?) */}
              {/* ------------------------------------------------- */}
              {diagnosticCase.currentState === 'TEST_TO_KNOW' && !isTestInputActive && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-wider block">
                      TEST-TO-KNOW
                    </span>
                    <h3 className="font-mono text-base font-bold text-white mt-0.5">
                      {diagnosticCase.activeTest?.title || 'Perform diagnostic test'}
                    </h3>
                    <div className="mt-2 text-xs font-mono text-white/70">
                      <span className="text-lime-400 font-semibold block mb-0.5">
                        WHAT UNKNOWN ARE WE TRYING TO RESOLVE?
                      </span>
                      {diagnosticCase.activeTest?.objective ||
                        diagnosticCase.activeTest?.whyThisTest ||
                        'Distinguish actual component degradation from cosmetic surface anomalies.'}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-graphite-950/80 border border-white/[0.06] space-y-1.5 text-xs font-mono text-white/80">
                    <div>
                      <span className="text-white/40">Information gain: </span>
                      <span className="text-lime-400 font-bold">HIGH</span>
                    </div>
                    <div>
                      <span className="text-white/40">Required tool: </span>
                      <span>
                        {diagnosticCase.activeTest?.requiredTools?.[0] || 'Multimeter / LCR Meter'}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/40">Safety: </span>
                      <span className="text-amber-400">Power disconnected</span>
                    </div>
                  </div>

                  <div className="text-xs font-mono text-white/60">
                    <span className="text-white/40 block mb-1">Procedure:</span>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Disconnect power & discharge</li>
                      <li>Place probes across {activeFault?.reference_designator || 'leads'}</li>
                      <li>Enter measured physical value</li>
                    </ol>
                  </div>

                  {/* PRIMARY CTA */}
                  <button
                    onClick={() => setIsTestInputActive(true)}
                    className="w-full py-3.5 px-4 rounded-xl bg-lime-400 text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-lime-300 transition-all shadow-lg shadow-lime-400/20 cursor-pointer"
                  >
                    RUN THIS TEST →
                  </button>
                </div>
              )}

              {/* ------------------------------------------------- */}
              {/* STATE 2: AWAITING_TEST / QUICK INPUT */}
              {/* ------------------------------------------------- */}
              {(diagnosticCase.currentState === 'AWAITING_TEST' || isTestInputActive) &&
                diagnosticCase.currentState !== 'INTERPRET_RESULT' &&
                diagnosticCase.currentState !== 'NEXT_ACTION' &&
                diagnosticCase.currentState !== 'REPAIR' &&
                diagnosticCase.currentState !== 'VERIFY' &&
                diagnosticCase.currentState !== 'RESOLVED' && (
                  <form onSubmit={handleTestSubmit} className="space-y-4">
                    <div>
                      <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-wider block">
                        ENTER TEST MEASUREMENT
                      </span>
                      <h3 className="font-mono text-sm font-bold text-white mt-0.5">
                        {diagnosticCase.activeTest?.title || 'Perform Diagnostic Test'}
                      </h3>
                    </div>

                    <div className="p-3.5 rounded-lg bg-graphite-950/80 border border-white/[0.06] space-y-3">
                      <div>
                        <label className="text-xs font-mono text-white/60 block mb-1.5">
                          Measured Value across {activeFault?.reference_designator || 'Component'}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="any"
                            value={numericValue}
                            onChange={(e) => setNumericValue(e.target.value)}
                            placeholder="e.g. 120"
                            className="flex-1 bg-graphite-900 border border-white/20 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-lime-400"
                            required
                          />
                          <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="bg-graphite-900 border border-white/20 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-lime-400"
                          >
                            <option value="µF">µF</option>
                            <option value="nF">nF</option>
                            <option value="pF">pF</option>
                            <option value="Ω">Ω</option>
                            <option value="kΩ">kΩ</option>
                            <option value="V">V</option>
                            <option value="mV">mV</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-mono text-white/60 block mb-1">
                          Technician Notes (optional)
                        </label>
                        <input
                          type="text"
                          value={testNotes}
                          onChange={(e) => setTestNotes(e.target.value)}
                          placeholder="e.g. In-circuit reading after discharge"
                          className="w-full bg-graphite-900 border border-white/20 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-lime-400"
                        />
                      </div>
                    </div>

                    {/* Quick presets for rapid technician input */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono text-white/40 block">
                        Quick Physical Result Presets:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickFill(120, 'µF', 'Degraded reading confirms dry-out.')}
                          className="p-2 rounded bg-graphite-950 border border-red-500/30 text-red-300 text-[10px] font-mono text-left hover:bg-red-950/20 transition-colors"
                        >
                          <span className="font-bold block">120 µF (LOW)</span>
                          <span className="text-white/40">Confirms fault</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickFill(475, 'µF', 'Nominal tolerance.')}
                          className="p-2 rounded bg-graphite-950 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono text-left hover:bg-emerald-950/20 transition-colors"
                        >
                          <span className="font-bold block">475 µF (NORMAL)</span>
                          <span className="text-white/40">Within spec</span>
                        </button>
                      </div>
                    </div>

                    {/* PRIMARY CTA: SUBMIT MEASUREMENT */}
                    <button
                      type="submit"
                      disabled={isSubmittingTest || !numericValue}
                      className="w-full py-3.5 px-4 rounded-xl bg-lime-400 text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-lime-300 transition-all shadow-lg shadow-lime-400/20 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingTest ? 'INTERPRETING...' : 'SUBMIT MEASUREMENT →'}
                    </button>
                  </form>
                )}

              {/* ------------------------------------------------- */}
              {/* STATE 3: INTERPRET_RESULT / NEXT_ACTION */}
              {/* ------------------------------------------------- */}
              {(diagnosticCase.currentState === 'INTERPRET_RESULT' ||
                diagnosticCase.currentState === 'NEXT_ACTION') && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-wider block">
                      RESULT INTERPRETED
                    </span>
                    <h3 className="font-mono text-sm font-bold text-white mt-0.5">
                      Physical Measurement Grounded
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-lg bg-graphite-950/90 border border-white/[0.06] space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">{activeFault?.reference_designator || 'Component'} Measured:</span>
                      <span className="text-lime-400 font-bold text-sm">
                        {numericValue || '—'} {unit || ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Test:</span>
                      <span className="text-white/80">{diagnosticCase.activeTest?.title || 'Measurement'}</span>
                    </div>
                    <div className="pt-2 border-t border-white/[0.06]">
                      <span className="text-white/40 block mb-0.5">Finding:</span>
                      <p className="text-emerald-400 font-semibold leading-relaxed">
                        {sortedHypotheses[0]?.status === 'SUPPORTED'
                          ? `${sortedHypotheses[0].id} confirmed at ${Math.round(sortedHypotheses[0].confidence * 100)}% confidence.`
                          : 'Analysis complete — leading hypothesis updated.'}
                      </p>
                    </div>
                  </div>

                  {/* Hypothesis probability shift */}
                  <div className="p-3 rounded-lg bg-graphite-950/60 border border-white/[0.04] space-y-1 text-xs font-mono">
                    <span className="text-[10px] text-white/40 uppercase block mb-1">
                      Hypothesis update:
                    </span>
                    {sortedHypotheses.slice(0, 3).map((h) => (
                      <div key={h.id} className={`flex justify-between items-center ${
                        h.status === 'SUPPORTED' ? 'text-emerald-400' :
                        h.status === 'WEAKENED' ? 'text-amber-400/70' :
                        'text-white/50'
                      }`}>
                        <span>{h.id}: {h.title.substring(0, 28)}{h.title.length > 28 ? '…' : ''}</span>
                        <span className="font-bold ml-2">{Math.round(h.confidence * 100)}%</span>
                      </div>
                    ))}
                  </div>

                  {/* PRIMARY CTA */}
                  <button
                    onClick={() => onVerifyRepair('')}
                    className="w-full py-3.5 px-4 rounded-xl bg-lime-400 text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-lime-300 transition-all shadow-lg shadow-lime-400/20 cursor-pointer"
                  >
                    VIEW REPAIR PLAN →
                  </button>
                </div>
              )}

              {/* ------------------------------------------------- */}
              {/* STATE 4: REPAIR */}
              {/* ------------------------------------------------- */}
              {diagnosticCase.currentState === 'REPAIR' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-wider block">
                      REPAIR PLAN
                    </span>
                    <h3 className="font-mono text-base font-bold text-white mt-0.5">
                      {diagnosticCase.repairPlan
                        ? `Replace ${diagnosticCase.repairPlan.componentToReplace}`
                        : `Repair ${activeFault?.reference_designator || 'identified component'}`}
                    </h3>
                  </div>

                  {diagnosticCase.repairPlan ? (
                    <div className="p-3.5 rounded-lg bg-graphite-950/90 border border-white/[0.06] space-y-2 text-xs font-mono">
                      <span className="text-white/40 block mb-1">Replacement Specs:</span>
                      <p className="text-white/90">{diagnosticCase.repairPlan.replacementSpecs}</p>
                      <div className="pt-1 border-t border-white/[0.06]">
                        <span className="text-white/40 block mb-0.5">Prerequisites:</span>
                        <ul className="space-y-0.5 text-white/80">
                          {diagnosticCase.repairPlan.prerequisites.slice(0, 2).map((p, i) => (
                            <li key={i}>• {p}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-graphite-950/90 border border-white/[0.06] text-xs font-mono text-white/60">
                      Repair plan ready for execution.
                    </div>
                  )}

                  {diagnosticCase.repairPlan?.safetyWarnings && diagnosticCase.repairPlan.safetyWarnings.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-400/30 text-xs font-mono text-amber-200/90 space-y-1">
                      <span className="text-amber-400 font-bold block">SAFETY WARNING:</span>
                      <p>{diagnosticCase.repairPlan.safetyWarnings[0]}</p>
                    </div>
                  )}

                  {/* PRIMARY CTA */}
                  <button
                    onClick={() => onVerifyRepair('')}
                    className="w-full py-3.5 px-4 rounded-xl bg-lime-400 text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-lime-300 transition-all shadow-lg shadow-lime-400/20 cursor-pointer"
                  >
                    START REPAIR / PROCEED TO VERIFY →
                  </button>
                </div>
              )}

              {/* ------------------------------------------------- */}
              {/* STATE 5: VERIFY */}
              {/* ------------------------------------------------- */}
              {diagnosticCase.currentState === 'VERIFY' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-lime-400 font-bold uppercase tracking-wider block">
                      REPAIR VERIFICATION
                    </span>
                    <h3 className="font-mono text-base font-bold text-white mt-0.5">
                      Upload Post-Repair Image
                    </h3>
                    <p className="text-xs font-mono text-white/60 mt-1">
                      Upload photographic proof of completed replacement.
                    </p>
                  </div>

                  {/* Simulated Upload Button */}
                  <div className="p-4 rounded-xl border-2 border-dashed border-white/20 text-center bg-graphite-950/60 space-y-2">
                    <span className="text-2xl block">📷</span>
                    <button
                      type="button"
                      disabled={isVerifyingRepair}
                      onClick={() => {
                        const simulatedB64 =
                          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
                        onVerifyRepair(simulatedB64);
                      }}
                      className="btn-primary text-xs py-2 px-4 cursor-pointer"
                    >
                      {isVerifyingRepair ? 'VERIFYING IMAGE...' : 'UPLOAD AFTER IMAGE'}
                    </button>
                    <span className="text-[10px] font-mono text-white/40 block">
                      JPEG, PNG or WebP
                    </span>
                  </div>

                  {/* Counterfactual comparison summary */}
                  <div className="p-3 rounded-lg bg-graphite-950/80 border border-white/[0.06] text-xs font-mono space-y-1">
                    <div className="flex justify-between text-white/60">
                      <span>BEFORE | AFTER comparison:</span>
                      <span className="text-emerald-400 font-bold">READY</span>
                    </div>
                    <div className="flex justify-between text-white/60">
                      <span>Verification status:</span>
                      <span className="text-lime-400 font-bold">
                        {diagnosticCase.verificationResult
                          ? `${diagnosticCase.verificationResult.status} (${Math.round((diagnosticCase.verificationResult.visualMatchScore || 0) * 100)}%)`
                          : 'Awaiting image'}
                      </span>
                    </div>
                  </div>

                  {/* PRIMARY CTA */}
                  <button
                    onClick={() => {
                      const simulatedB64 =
                        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
                      onVerifyRepair(simulatedB64);
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-lime-400 text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-lime-300 transition-all shadow-lg shadow-lime-400/20 cursor-pointer"
                  >
                    COMPLETE VERIFICATION →
                  </button>
                </div>
              )}

              {/* ------------------------------------------------- */}
              {/* STATE 6: RESOLVED */}
              {/* ------------------------------------------------- */}
              {diagnosticCase.currentState === 'RESOLVED' && (
                <div className="space-y-4">
                  <div className="text-center py-2">
                    <span className="text-3xl block mb-2">🎉</span>
                    <h3 className="font-mono text-base font-bold text-emerald-400 uppercase tracking-wide">
                      DIAGNOSTIC RESOLVED
                    </h3>
                  </div>

                  <div className="p-3.5 rounded-lg bg-graphite-950 border border-emerald-500/30 text-xs font-mono space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/40">Fault:</span>
                      <span className="text-white font-semibold">
                        {activeFault?.title || diagnosticCase.title || 'Fault resolved'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Component:</span>
                      <span className="text-white font-semibold">
                        {activeFault?.reference_designator || activeComponent?.referenceDesignator || '—'}
                      </span>
                    </div>
                    {diagnosticCase.verificationResult && (
                      <div className="flex justify-between">
                        <span className="text-white/40">Verification:</span>
                        <span className={`font-bold ${
                          diagnosticCase.verificationResult.status === 'VERIFIED'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}>
                          {diagnosticCase.verificationResult.status} ({Math.round((diagnosticCase.verificationResult.visualMatchScore || 0) * 100)}%)
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-white/40">Evidence:</span>
                      <span className="text-white/80">{diagnosticCase.evidence.length} items documented</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => toggleSection('history')}
                      className="w-full py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider font-semibold transition-colors"
                    >
                      VIEW DIAGNOSTIC REPORT
                    </button>
                    <button
                      onClick={onNewAnalysis}
                      className="w-full py-3 px-4 rounded-xl bg-lime-400 text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-lime-300 transition-all shadow-lg shadow-lime-400/20"
                    >
                      RETURN TO DASHBOARD
                    </button>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------- */}
              {/* DEFAULT FALLBACK (OBSERVE / IDENTIFY / HYPOTHESIZE) */}
              {/* ------------------------------------------------- */}
              {diagnosticCase.currentState !== 'TEST_TO_KNOW' &&
                diagnosticCase.currentState !== 'AWAITING_TEST' &&
                diagnosticCase.currentState !== 'INTERPRET_RESULT' &&
                diagnosticCase.currentState !== 'NEXT_ACTION' &&
                diagnosticCase.currentState !== 'REPAIR' &&
                diagnosticCase.currentState !== 'VERIFY' &&
                diagnosticCase.currentState !== 'RESOLVED' &&
                !isTestInputActive && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-mono text-sm font-bold text-white">
                        {diagnosticCase.activeTest?.title || 'Perform diagnostic test'}
                      </h3>
                      <div className="mt-2 text-xs font-mono text-white/70">
                        <span className="text-lime-400 font-semibold block mb-0.5">
                          WHAT UNKNOWN ARE WE TRYING TO RESOLVE?
                        </span>
                        {diagnosticCase.activeTest?.objective ||
                          diagnosticCase.activeTest?.whyThisTest ||
                          'Confirm physical state through diagnostic measurement.'}
                      </div>
                    </div>

                    <div className="text-xs font-mono text-amber-300 bg-amber-950/20 p-2.5 rounded border border-amber-400/20">
                      <span className="font-bold">SAFETY: </span>
                      {diagnosticCase.activeTest?.safetyWarnings?.[0] || 'Ensure safe working conditions before testing.'}
                    </div>

                    <button
                      onClick={() => setIsTestInputActive(true)}
                      className="w-full py-3.5 px-4 rounded-xl bg-lime-400 text-black font-mono text-xs uppercase tracking-wider font-bold hover:bg-lime-300 transition-all shadow-lg shadow-lime-400/20 cursor-pointer"
                    >
                      RUN THIS TEST →
                    </button>
                  </div>
                )}
            </div>
          )}
        </section>
      </main>

      {/* ========================================================= */}
      {/* 5. COLLAPSIBLE DIAGNOSTIC DETAILS (DEEP DIVES)            */}
      {/* ========================================================= */}
      <section className="space-y-2 pt-2">
        {/* Accordion 1: Evidence details */}
        <div className="border border-white/[0.06] rounded-xl bg-graphite-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('evidenceDetails')}
            className="w-full flex items-center justify-between px-4 py-3 text-left font-mono text-xs text-white/70 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{openSections.evidenceDetails ? '▾' : '▸'}</span>
              <span>Evidence details & provenance</span>
            </span>
            <span className="text-[10px] text-white/40">
              {diagnosticCase.evidence.length} claims documented
            </span>
          </button>
          {openSections.evidenceDetails && (
            <div className="p-4 border-t border-white/[0.06] bg-graphite-950/60 animate-fade-in">
              <EvidencePanel evidence={diagnosticCase.evidence} />
            </div>
          )}
        </div>

        {/* Accordion 2: Why this test? (Technical Procedure) */}
        <div className="border border-white/[0.06] rounded-xl bg-graphite-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('whyThisTest')}
            className="w-full flex items-center justify-between px-4 py-3 text-left font-mono text-xs text-white/70 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{openSections.whyThisTest ? '▾' : '▸'}</span>
              <span>Why this test? (Information gain & full procedure)</span>
            </span>
            <span className="text-[10px] text-white/40">
              {diagnosticCase.activeTest ? diagnosticCase.activeTest.title : 'Details'}
            </span>
          </button>
          {openSections.whyThisTest && diagnosticCase.activeTest && (
            <div className="p-4 border-t border-white/[0.06] bg-graphite-950/60 animate-fade-in">
              <TestToKnowCard
                test={diagnosticCase.activeTest}
                isSubmitting={isSubmittingTest}
                onSubmitResult={onSubmitTestResult}
              />
            </div>
          )}
        </div>

        {/* Accordion 3: Full Hypothesis Reasoning & Disconfirming Criteria */}
        <div className="border border-white/[0.06] rounded-xl bg-graphite-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('hypothesisTree')}
            className="w-full flex items-center justify-between px-4 py-3 text-left font-mono text-xs text-white/70 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{openSections.hypothesisTree ? '▾' : '▸'}</span>
              <span>Full hypothesis reasoning & disconfirming criteria</span>
            </span>
            <span className="text-[10px] text-white/40">
              {diagnosticCase.hypotheses.length} branches
            </span>
          </button>
          {openSections.hypothesisTree && (
            <div className="p-4 border-t border-white/[0.06] bg-graphite-950/60 animate-fade-in">
              <HypothesisTree hypotheses={diagnosticCase.hypotheses} />
            </div>
          )}
        </div>

        {/* Accordion 4: Camera guidance */}
        <div className="border border-white/[0.06] rounded-xl bg-graphite-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('cameraGuidance')}
            className="w-full flex items-center justify-between px-4 py-3 text-left font-mono text-xs text-white/70 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{openSections.cameraGuidance ? '▾' : '▸'}</span>
              <span>Camera guidance (Active Camera Coach)</span>
            </span>
            <span className="text-[10px] text-white/40">Macro alignment parameters</span>
          </button>
          {openSections.cameraGuidance && diagnosticCase.cameraCoach && (
            <div className="p-4 border-t border-white/[0.06] bg-graphite-950/60 animate-fade-in text-xs font-mono space-y-2">
              <div>
                <span className="text-white/40">Target: </span>
                <span className="text-white font-semibold">
                  {diagnosticCase.cameraCoach.target}
                </span>
              </div>
              <div>
                <span className="text-white/40">Distance: </span>
                <span className="text-white">{diagnosticCase.cameraCoach.howClose}</span>
              </div>
              <div>
                <span className="text-white/40">Angle: </span>
                <span className="text-white">{diagnosticCase.cameraCoach.whatAngle}</span>
              </div>
              <div>
                <span className="text-white/40">Lighting: </span>
                <span className="text-white">
                  {diagnosticCase.cameraCoach.lightingRequirement}
                </span>
              </div>
              <div>
                <span className="text-white/40">Reason: </span>
                <span className="text-white/80">{diagnosticCase.cameraCoach.reason}</span>
              </div>
            </div>
          )}
        </div>

        {/* Accordion 5: Investigation history & confidence timeline */}
        <div className="border border-white/[0.06] rounded-xl bg-graphite-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('history')}
            className="w-full flex items-center justify-between px-4 py-3 text-left font-mono text-xs text-white/70 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{openSections.history ? '▾' : '▸'}</span>
              <span>Investigation history & confidence evolution</span>
            </span>
            <span className="text-[10px] text-white/40">
              {diagnosticCase.confidenceTimeline.length} events logged
            </span>
          </button>
          {openSections.history && (
            <div className="p-4 border-t border-white/[0.06] bg-graphite-950/60 animate-fade-in">
              <ConfidenceTimeline timeline={diagnosticCase.confidenceTimeline} />
            </div>
          )}
        </div>

        {/* Accordion 6: Full Repair Protocol & Counterfactuals */}
        {diagnosticCase.repairPlan && (
          <div className="border border-white/[0.06] rounded-xl bg-graphite-900/60 overflow-hidden">
            <button
              onClick={() => toggleSection('repairProtocol')}
              className="w-full flex items-center justify-between px-4 py-3 text-left font-mono text-xs text-white/70 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>{openSections.repairProtocol ? '▾' : '▸'}</span>
                <span>Repair protocol & counterfactual verification</span>
              </span>
              <span className="text-[10px] text-white/40">
                Specs: {diagnosticCase.repairPlan.replacementSpecs}
              </span>
            </button>
            {openSections.repairProtocol && (
              <div className="p-4 border-t border-white/[0.06] bg-graphite-950/60 animate-fade-in">
                <RepairPlanPanel
                  repairPlan={diagnosticCase.repairPlan}
                  verificationResult={diagnosticCase.verificationResult}
                  afterImageUrl={diagnosticCase.afterImageUrl}
                  onVerifyRepair={onVerifyRepair}
                  isVerifying={isVerifyingRepair}
                />
              </div>
            )}
          </div>
        )}

        {/* Accordion 7: Grounding sources */}
        <div className="border border-white/[0.06] rounded-xl bg-graphite-900/60 overflow-hidden">
          <button
            onClick={() => toggleSection('grounding')}
            className="w-full flex items-center justify-between px-4 py-3 text-left font-mono text-xs text-white/70 hover:text-white hover:bg-white/[0.02] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{openSections.grounding ? '▾' : '▸'}</span>
              <span>Grounding sources & RAG references</span>
            </span>
            <span className="text-[10px] text-white/40">
              {diagnosticCase.domain ? `Domain: ${diagnosticCase.domain}` : 'Knowledge Docs'}
            </span>
          </button>
          {openSections.grounding && (
            <div className="p-4 border-t border-white/[0.06] bg-graphite-950/60 animate-fade-in text-xs font-mono space-y-1.5 text-white/80">
              {diagnosticCase.evidence.some(e => e.provenance === 'USER_IMAGE') && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>📷</span>
                  <span>Visual Analysis (Operator Image)</span>
                </div>
              )}
              {diagnosticCase.evidence.some(e => e.provenance === 'MODEL_INFERENCE') && (
                <div className="flex items-center gap-2 text-lime-400">
                  <span>🤖</span>
                  <span>Gemma 4 Vision Analysis (via Sarvam AI)</span>
                </div>
              )}
              {diagnosticCase.domain === 'ELECTRONICS' && (
                <>
                  <div className="flex items-center gap-2 text-cyan-400">
                    <span>📄</span>
                    <span>IPC-7711/7721 Rework, Modification and Repair of Electronic Assemblies</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-400">
                    <span>📄</span>
                    <span>capacitor_discharge.md (RAG Reference Document)</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-400">
                    <span>📄</span>
                    <span>electrical_safety_precautions.md (Safety Service Policy)</span>
                  </div>
                </>
              )}
              {diagnosticCase.domain === 'MECHANICAL' && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <span>📄</span>
                  <span>belt_drive_tension.md (RAG Reference Document)</span>
                </div>
              )}
              {diagnosticCase.domain === 'NETWORK' && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <span>📄</span>
                  <span>rj45_network_termination.md (RAG Reference Document)</span>
                </div>
              )}
              {(!diagnosticCase.domain || diagnosticCase.domain === 'GENERAL' || diagnosticCase.domain === 'PLANT') && (
                <div className="flex items-center gap-2 text-white/50">
                  <span>📷</span>
                  <span>Visual Analysis only — no domain-specific knowledge applied</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
