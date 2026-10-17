/**
 * SafetyWarning – Renders a safety advisory when the AI identifies risk.
 * Only shown when safetyWarning is non-null.
 */

interface SafetyWarningProps {
  warning: string;
}

export function SafetyWarning({ warning }: SafetyWarningProps) {
  return (
    <div className="flex gap-3 p-4 rounded-xl border border-orange-400/25 bg-orange-400/[0.06] animate-fade-in">
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-orange-400">
          <path d="M8 1L15 14H1L8 1z" stroke="currentColor" strokeWidth="1.2"
            fill="none" strokeLinejoin="round"/>
          <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Content */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-orange-400/80 mb-1">
          Safety Advisory
        </p>
        <p className="text-orange-200/70 text-xs leading-relaxed font-light">{warning}</p>
      </div>
    </div>
  );
}
