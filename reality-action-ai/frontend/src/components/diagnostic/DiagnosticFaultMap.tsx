import React, { useState } from 'react';
import type { FaultBox, CameraCoachInstruction, ImageQualityAssessment } from '../../types';

interface DiagnosticFaultMapProps {
  imageUrl: string;
  faults: FaultBox[];
  selectedFaultId: string | null;
  onSelectFault: (faultId: string | null) => void;
  cameraCoach?: CameraCoachInstruction | null;
  imageQuality?: ImageQualityAssessment | null;
}

export const DiagnosticFaultMap: React.FC<DiagnosticFaultMapProps> = ({
  imageUrl,
  faults,
  selectedFaultId,
  onSelectFault,
  cameraCoach,
  imageQuality,
}) => {
  const [hoveredFaultId, setHoveredFaultId] = useState<string | null>(null);

  const getSeverityStyles = (severity: string, isSelected: boolean) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return isSelected
          ? 'border-red-500 bg-red-500/20 ring-2 ring-red-500 shadow-red-500/30'
          : 'border-red-500/70 bg-red-500/10 hover:border-red-500 hover:bg-red-500/20';
      case 'WARNING':
        return isSelected
          ? 'border-amber-400 bg-amber-400/20 ring-2 ring-amber-400 shadow-amber-400/30'
          : 'border-amber-400/70 bg-amber-400/10 hover:border-amber-400 hover:bg-amber-400/20';
      default:
        return isSelected
          ? 'border-cyan-400 bg-cyan-400/20 ring-2 ring-cyan-400 shadow-cyan-400/30'
          : 'border-cyan-400/70 bg-cyan-400/10 hover:border-cyan-400 hover:bg-cyan-400/20';
    }
  };

  const getBadgeColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500 text-white';
      case 'WARNING':
        return 'bg-amber-400 text-black';
      default:
        return 'bg-cyan-400 text-black';
    }
  };

  const selectedFault = faults.find((f) => f.id === selectedFaultId);

  // Clamp helper to ensure coordinates stay inside 0.0 - 1.0 range
  const clamp = (val: number, min = 0, max = 1) => Math.max(min, Math.min(max, val || 0));

  return (
    <div className="flex flex-col gap-3">
      {/* Image container with spatial bounding boxes */}
      <div className="relative w-full rounded-xl overflow-hidden bg-black/90 border border-white/[0.08] group select-none shadow-xl min-h-[260px] flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="PCB Diagnostic Subject"
            className="w-full h-auto object-contain max-h-[500px] block transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-2 text-white/40 font-mono text-xs">
            <span className="text-2xl opacity-40">🗺️</span>
            <span>Spatial Fault Map Active</span>
            <span className="text-[10px] text-white/30">Awaiting visual image preview</span>
          </div>
        )}

        {/* Spatial Fault Overlays (Only render if image is present and faults exist) */}
        {imageUrl &&
          faults.map((fault) => {
            const isSelected = selectedFaultId === fault.id;
            const isHovered = hoveredFaultId === fault.id;

            const ymin = clamp(fault.ymin);
            const ymax = clamp(fault.ymax);
            const xmin = clamp(fault.xmin);
            const xmax = clamp(fault.xmax);

            const topPercent = Math.min(ymin, ymax) * 100;
            const leftPercent = Math.min(xmin, xmax) * 100;
            const widthPercent = Math.max(2, Math.abs(xmax - xmin) * 100);
            const heightPercent = Math.max(2, Math.abs(ymax - ymin) * 100);

            // If box is near the top edge (< 8%), place tag inside box to avoid collision with top edge
            const isNearTop = topPercent < 8;

            return (
              <div
                key={fault.id}
                onClick={() => onSelectFault(isSelected ? null : fault.id)}
                onMouseEnter={() => setHoveredFaultId(fault.id)}
                onMouseLeave={() => setHoveredFaultId(null)}
                style={{
                  top: `${topPercent}%`,
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  height: `${heightPercent}%`,
                }}
                className={`absolute border-2 rounded transition-all duration-200 cursor-pointer ${
                  isSelected || isHovered ? 'z-20' : 'z-10'
                } ${getSeverityStyles(fault.severity, isSelected || isHovered)}`}
              >
                {/* Fault Label Tag */}
                <div
                  className={`absolute flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shadow-lg transition-all pointer-events-auto whitespace-nowrap ${
                    isNearTop ? 'top-1 left-1' : '-top-6 left-0'
                  } ${getBadgeColor(fault.severity)}`}
                >
                  <span className="max-w-[140px] truncate">{fault.label || fault.defect || 'FAULT'}</span>
                  <span className="opacity-80 font-normal">
                    {Math.round((fault.confidence || 0.95) * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Interactive Spatial Focus Status & Image Quality Bar (Clean, non-conflicting placement) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-graphite-950/80 border border-white/[0.06] text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="text-lime-400">📍</span>
          {selectedFault ? (
            <span className="text-white">
              <span className="text-lime-400 font-bold">
                {selectedFault.component || selectedFault.label}
              </span>{' '}
              highlighted on image
            </span>
          ) : (
            <span className="text-white/60">
              Click component box on image to focus
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {imageQuality && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  imageQuality.overall === 'SUFFICIENT'
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-white/50">Quality:</span>
              <span
                className={
                  imageQuality.overall === 'SUFFICIENT'
                    ? 'text-emerald-400 font-bold'
                    : 'text-amber-400 font-bold'
                }
              >
                {imageQuality.overall}
              </span>
            </div>
          )}

          {selectedFault && (
            <button
              type="button"
              onClick={() => onSelectFault(null)}
              className="text-[10px] text-white/40 hover:text-white transition-colors cursor-pointer underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Active Camera Coach Guidance */}
      {cameraCoach && (
        <div className="bg-cyan-950/20 border border-cyan-400/20 rounded-xl p-3.5 flex items-start gap-3">
          <div className="w-6 h-6 rounded bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs">📸</span>
          </div>
          <div className="text-xs font-mono">
            <div className="text-cyan-400 font-bold uppercase mb-0.5">
              ACTIVE CAMERA COACH · {cameraCoach.target}
            </div>
            <p className="text-white/80 mb-1">{cameraCoach.reason}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
              <span>Aim: {cameraCoach.whereToPoint}</span>
              <span>Distance: {cameraCoach.howClose}</span>
              <span>Angle: {cameraCoach.whatAngle}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
