/**
 * AnalysisPanel – The right-hand panel showing the full AI analysis result.
 */

import type { AnalysisResult } from '../types';
import { AnalysisSection } from './AnalysisSection';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { SafetyWarning } from './SafetyWarning';
import { StepList } from './StepList';

interface AnalysisPanelProps {
  result: AnalysisResult;
  onReset: () => void;
  isSaved?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
}

export function AnalysisPanel({
  result,
  onReset,
  isSaved,
  isSaving,
  onSave,
}: AnalysisPanelProps) {
  return (
    <div className="flex flex-col gap-5 animate-slide-in-right h-full overflow-y-auto no-scrollbar">
      {/* Panel header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
          <span className="font-mono text-xs text-lime-400/70 uppercase tracking-[0.15em]">
            Analysis Complete
          </span>
        </div>
        <div className="flex items-center gap-3">
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving || isSaved}
              className={`label-tech text-xs uppercase px-2.5 py-1 rounded border transition-all ${
                isSaved
                  ? 'border-lime-400/30 bg-lime-400/10 text-lime-400'
                  : 'border-white/10 hover:border-lime-400/40 text-white/50 hover:text-lime-400'
              }`}
            >
              {isSaving ? 'Saving...' : isSaved ? '✓ Saved' : 'Save to History'}
            </button>
          )}
          <button
            onClick={onReset}
            className="label-tech text-white/30 hover:text-white/60 uppercase transition-colors"
            aria-label="Reset analysis"
          >
            Reset ×
          </button>
        </div>
      </div>

      {/* Safety warning — always first if present */}
      {result.safetyWarning && (
        <SafetyWarning warning={result.safetyWarning} />
      )}

      {/* Grounding references if retrieved by RAG */}
      {result.groundingSources && result.groundingSources.length > 0 && (
        <div className="p-3.5 rounded-lg border border-lime-400/20 bg-lime-400/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-lime-400 font-semibold">
                Grounding
              </span>
            </div>
            <span className="font-mono text-[11px] text-white/50">
              {result.groundingSources.length} technical {result.groundingSources.length === 1 ? 'reference' : 'references'} used
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.groundingSources.map((src, idx) => (
              <span
                key={idx}
                className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40 border border-white/10 text-white/70"
              >
                {src}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* What I see */}
      <AnalysisSection title="What I See">
        {result.whatISee}
      </AnalysisSection>

      <div className="tech-divider" />

      {/* What's happening */}
      <AnalysisSection title="What's Happening">
        {result.whatIsHappening}
      </AnalysisSection>

      <div className="tech-divider" />

      {/* What to do next — highlighted */}
      <AnalysisSection title="What to Do Next" highlight>
        {result.nextAction}
      </AnalysisSection>

      <div className="tech-divider" />

      {/* Step-by-step */}
      <div>
        <h3 className="section-title">Step-by-Step</h3>
        <StepList steps={result.steps} />
      </div>

      <div className="tech-divider" />

      {/* Confidence */}
      <ConfidenceIndicator confidence={result.confidence} />
    </div>
  );
}
