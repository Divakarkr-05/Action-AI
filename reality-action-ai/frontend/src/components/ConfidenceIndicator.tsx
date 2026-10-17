/**
 * ConfidenceIndicator – Displays AI confidence as a visual bar + label.
 */

interface ConfidenceIndicatorProps {
  confidence: number; // 0–1
}

export function ConfidenceIndicator({ confidence }: ConfidenceIndicatorProps) {
  const pct = Math.round(confidence * 100);

  const label =
    pct >= 85 ? 'HIGH' :
    pct >= 65 ? 'MODERATE' :
    'LOW';

  const color =
    pct >= 85 ? 'bg-lime-400' :
    pct >= 65 ? 'bg-yellow-400' :
    'bg-orange-400';

  const textColor =
    pct >= 85 ? 'text-lime-400' :
    pct >= 65 ? 'text-yellow-400' :
    'text-orange-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="section-title mb-0">Confidence</span>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs font-semibold ${textColor}`}>{label}</span>
          <span className="label-tech text-white/30">{pct}%</span>
        </div>
      </div>

      <div className="confidence-track">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-1.5 label-tech text-white/25">
        {pct >= 85
          ? 'Strong visual match — act with confidence.'
          : pct >= 65
          ? 'Reasonable inference — verify before acting.'
          : 'Limited confidence — consult additional sources.'}
      </p>
    </div>
  );
}
