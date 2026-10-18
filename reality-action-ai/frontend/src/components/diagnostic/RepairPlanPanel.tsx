import React, { useRef, useState } from 'react';
import type { RepairPlan, VerificationResult } from '../../types';

interface RepairPlanPanelProps {
  repairPlan: RepairPlan;
  verificationResult?: VerificationResult | null;
  afterImageUrl?: string | null;
  onVerifyRepair: (afterImageBase64: string) => void;
  isVerifying: boolean;
}

export const RepairPlanPanel: React.FC<RepairPlanPanelProps> = ({
  repairPlan,
  verificationResult,
  afterImageUrl,
  onVerifyRepair,
  isVerifying,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(afterImageUrl || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setSelectedImage(dataUrl);
      onVerifyRepair(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSimulatedAfterUpload = () => {
    // 1x1 test pixel as simulated after image for testing
    const simulatedB64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    setSelectedImage(simulatedB64);
    onVerifyRepair(simulatedB64);
  };

  return (
    <div className="bg-graphite-900 border border-white/[0.08] rounded-xl p-5 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div>
          <span className="text-[10px] font-mono text-lime-400 font-bold tracking-wider uppercase block">
            PHASE: REPAIR & VERIFY
          </span>
          <h3 className="font-mono text-base font-bold text-white mt-0.5">
            Physical Repair Protocol · {repairPlan.componentToReplace}
          </h3>
        </div>
        <span className="text-[10px] font-mono bg-lime-400/10 text-lime-400 border border-lime-400/30 px-2.5 py-0.5 rounded">
          SPECS: {repairPlan.replacementSpecs}
        </span>
      </div>

      {/* Safety Warnings */}
      {repairPlan.safetyWarnings.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-400/30 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-xs font-bold mb-1">
            <span>⚡</span>
            <span>REPAIR SAFETY PRECAUTIONS</span>
          </div>
          <ul className="list-disc list-inside text-amber-200/80 font-mono text-xs space-y-0.5">
            {repairPlan.safetyWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Counterfactual Prediction Card (Phase 28) */}
      {repairPlan.counterfactualPrediction && (
        <div className="bg-cyan-950/20 border border-cyan-400/20 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs font-bold uppercase">
            <span>🔮</span>
            <span>COUNTERFACTUAL REPAIR PREDICTION</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            <div className="bg-graphite-950/60 p-2.5 rounded border border-white/[0.04]">
              <span className="text-emerald-400 block mb-0.5 font-bold">
                EXPECTED VISUAL CHANGE:
              </span>
              <p className="text-white/80">
                {repairPlan.counterfactualPrediction.expectedVisualChange}
              </p>
            </div>
            <div className="bg-graphite-950/60 p-2.5 rounded border border-white/[0.04]">
              <span className="text-cyan-400 block mb-0.5 font-bold">
                EXPECTED ELECTRICAL CHANGE:
              </span>
              <p className="text-white/80">
                {repairPlan.counterfactualPrediction.expectedElectricalChange}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step by step procedure */}
      <div>
        <span className="text-white/40 font-mono text-xs block mb-1.5">
          REPAIR PROCEDURE STEPS:
        </span>
        <ol className="space-y-1.5 font-mono text-xs text-white/80 list-decimal list-inside bg-graphite-950/50 p-3 rounded-lg border border-white/[0.04]">
          {repairPlan.procedureSteps.map((step, idx) => (
            <li key={idx} className="leading-relaxed">
              {step.replace(/^\d+\.\s*/, '')}
            </li>
          ))}
        </ol>
      </div>

      {/* Before / After Verification Section (Phase 29) */}
      <div className="bg-graphite-950 p-4 rounded-xl border border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs font-bold text-white uppercase block">
            BEFORE / AFTER PHOTOGRAPHIC VERIFICATION
          </span>
          {verificationResult && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                verificationResult.status === 'VERIFIED'
                  ? 'bg-emerald-400/20 text-emerald-400 border-emerald-400/40'
                  : 'bg-amber-400/20 text-amber-400 border-amber-400/40'
              }`}
            >
              {verificationResult.status} (Match: {Math.round(verificationResult.visualMatchScore * 100)}%)
            </span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {selectedImage ? (
          <div className="space-y-3">
            <div className="max-h-56 rounded-lg overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Post-repair verification"
                className="max-h-56 object-contain"
              />
            </div>

            {verificationResult && (
              <div className="bg-graphite-900 p-3 rounded-lg border border-white/[0.06] text-xs font-mono space-y-2">
                <p className="text-white/90">{verificationResult.summary}</p>
                <div>
                  <span className="text-emerald-400 font-bold block mb-1">
                    DETECTED PHYSICAL CHANGES:
                  </span>
                  <ul className="list-disc list-inside text-white/70 space-y-0.5">
                    {verificationResult.detectedChanges.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-mono text-lime-400 hover:underline"
            >
              Upload Different After Image
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-white/10 hover:border-lime-400/50 rounded-xl p-6 text-center transition-colors">
            <p className="font-mono text-xs text-white/60 mb-3">
              Upload a photograph of the repaired board to verify solder wetting, component orientation, and defect resolution.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isVerifying}
                className="btn-primary py-2 px-4 text-xs font-mono uppercase"
              >
                {isVerifying ? 'Verifying Fix...' : 'Upload Repaired Image'}
              </button>
              <button
                type="button"
                onClick={handleSimulatedAfterUpload}
                disabled={isVerifying}
                className="btn-ghost py-2 px-3 text-xs font-mono"
              >
                [SIMULATED AFTER IMAGE]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
