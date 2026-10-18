import React, { useState } from 'react';
import type { DiagnosticTest } from '../../types';

interface TestToKnowCardProps {
  test: DiagnosticTest;
  isSubmitting: boolean;
  onSubmitResult: (params: {
    resultType: 'NUMERIC' | 'TEXT' | 'CHOICE';
    numericValue?: number;
    unit?: string;
    textValue?: string;
    notes?: string;
  }) => void;
}

export const TestToKnowCard: React.FC<TestToKnowCardProps> = ({
  test,
  isSubmitting,
  onSubmitResult,
}) => {
  const [numericValue, setNumericValue] = useState<string>('');
  const [unit, setUnit] = useState<string>('uF');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(numericValue);
    if (isNaN(val)) return;

    onSubmitResult({
      resultType: 'NUMERIC',
      numericValue: val,
      unit,
      notes: notes || undefined,
    });
  };

  const handleSimulatedConfirm = () => {
    onSubmitResult({
      resultType: 'NUMERIC',
      numericValue: 120.0,
      unit: 'uF',
      notes: 'SIMULATED TEST RESULT: Measured 120uF across component leads after discharge.',
    });
  };

  const handleSimulatedRefute = () => {
    onSubmitResult({
      resultType: 'NUMERIC',
      numericValue: 475.0,
      unit: 'uF',
      notes: 'SIMULATED TEST RESULT: Measured 475uF (nominal tolerance), testing alternative hypothesis.',
    });
  };

  return (
    <div className="bg-graphite-900 border border-white/[0.08] rounded-xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3 mb-4">
        <div>
          <span className="text-[10px] font-mono text-lime-400 font-bold tracking-wider uppercase block">
            TEST-TO-KNOW · HIGHEST INFORMATION GAIN
          </span>
          <h3 className="font-mono text-base font-bold text-white mt-0.5">
            {test.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 px-2 py-0.5 rounded">
            Discriminating Power: {Math.round(test.discriminatingPower * 100)}%
          </span>
        </div>
      </div>

      {/* Why this test banner */}
      <div className="bg-lime-400/[0.06] border border-lime-400/20 rounded-lg p-3 mb-4">
        <span className="text-lime-400 font-mono text-xs font-bold block mb-1">
          💡 WHY THIS TEST?
        </span>
        <p className="text-white/80 font-mono text-xs leading-relaxed">
          {test.whyThisTest}
        </p>
      </div>

      {/* Safety Warnings */}
      {test.safetyWarnings.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-400/30 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs font-bold mb-1">
            <span className="animate-pulse">⚡</span>
            <span>MANDATORY SAFETY PREFLIGHT</span>
          </div>
          <ul className="list-disc list-inside text-amber-200/80 font-mono text-xs space-y-0.5">
            {test.safetyWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tools & Prerequisites */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 font-mono text-xs">
        <div className="bg-graphite-950/60 p-2.5 rounded border border-white/[0.04]">
          <span className="text-white/40 block mb-1">REQUIRED TOOLS:</span>
          <div className="flex flex-wrap gap-1">
            {test.requiredTools.map((tool, idx) => (
              <span
                key={idx}
                className="bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded text-white/80"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-graphite-950/60 p-2.5 rounded border border-white/[0.04]">
          <span className="text-white/40 block mb-1">PREREQUISITES:</span>
          <div className="flex flex-wrap gap-1">
            {test.prerequisites.map((prereq, idx) => (
              <span
                key={idx}
                className="bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded text-white/80"
              >
                {prereq}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Step by step procedure */}
      <div className="mb-4">
        <span className="text-white/40 font-mono text-xs block mb-1.5">
          STEP-BY-STEP PROCEDURE:
        </span>
        <ol className="space-y-1.5 font-mono text-xs text-white/80 list-decimal list-inside bg-graphite-950/40 p-3 rounded-lg border border-white/[0.04]">
          {test.procedure.map((step, idx) => (
            <li key={idx} className="leading-relaxed">
              {step.replace(/^\d+\.\s*/, '')}
            </li>
          ))}
        </ol>
      </div>

      {/* Expected Outcomes */}
      <div className="mb-5">
        <span className="text-white/40 font-mono text-xs block mb-1.5">
          EXPECTED OUTCOMES & HYPOTHESIS IMPACT:
        </span>
        <div className="space-y-1.5">
          {test.expectedOutcomes.map((out, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded bg-graphite-950/70 border border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-lime-400 font-bold">{out.condition}</span>
                <span className="text-white/30">→</span>
                <span className="text-white/80">{out.interpretation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Physical measurement submission form */}
      <form
        onSubmit={handleSubmit}
        className="bg-graphite-950 p-4 rounded-xl border border-lime-400/20"
      >
        <span className="font-mono text-xs font-bold text-lime-400 uppercase block mb-2">
          SUBMIT OPERATOR TEST RESULT
        </span>
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <div className="flex-1">
            <input
              type="number"
              step="any"
              required
              value={numericValue}
              onChange={(e) => setNumericValue(e.target.value)}
              placeholder="e.g. 120"
              className="w-full bg-graphite-900 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-lime-400"
            />
          </div>
          <div className="w-24">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-graphite-900 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-lime-400"
            >
              <option value="uF">uF</option>
              <option value="ohms">Ω</option>
              <option value="V">V</option>
              <option value="mV">mV</option>
              <option value="mA">mA</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !numericValue}
            className="btn-primary py-2 px-5 text-xs uppercase tracking-wider shrink-0 disabled:opacity-50"
          >
            {isSubmitting ? 'Interpreting...' : 'Submit Measurement'}
          </button>
        </div>

        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional technician notes or observations (e.g. measured across leads)"
          className="w-full bg-graphite-900 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white/70 focus:outline-none focus:border-lime-400"
        />

        {/* Rapid simulated buttons clearly marked for automated testing & demos */}
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-white/40">
            RAPID DEMO SIMULATION:
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSimulatedConfirm}
              disabled={isSubmitting}
              className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono"
            >
              [SIMULATE: 120 µF (Confirms H1)]
            </button>
            <button
              type="button"
              onClick={handleSimulatedRefute}
              disabled={isSubmitting}
              className="px-2.5 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-mono"
            >
              [SIMULATE: 475 µF (Refutes H1)]
            </button>
            <button
              type="button"
              onClick={() =>
                onSubmitResult({
                  resultType: 'TEXT',
                  textValue: 'INCONCLUSIVE',
                  notes: 'Test measurement inconclusive or component unreachable.',
                })
              }
              disabled={isSubmitting}
              className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white/60 text-[10px] font-mono"
            >
              Inconclusive / Cannot Measure
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
