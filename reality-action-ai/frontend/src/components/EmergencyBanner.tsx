/**
 * REALITY → ACTION AI – Emergency & Safety Response Banner
 *
 * Prominently displays safety advisories, immediate life-safety actions,
 * and verified government emergency contacts with clickable 'tel:' links.
 *
 * States supported:
 *   - NORMAL (hidden)
 *   - INFO
 *   - WARNING
 *   - URGENT
 *   - EMERGENCY
 */

import type { EmergencyResponse, SafetySeverity } from '../types';

interface EmergencyBannerProps {
  response: EmergencyResponse;
}

export function EmergencyBanner({ response }: EmergencyBannerProps) {
  const {
    severity,
    title,
    message,
    immediateActions,
    avoidActions,
    helplines,
  } = response;

  if (severity === 'NORMAL') {
    return null;
  }

  // Styling palette based on safety severity
  const getSeverityStyle = (sev: SafetySeverity) => {
    switch (sev) {
      case 'EMERGENCY':
        return {
          wrapper: 'bg-red-950/70 border-red-500/70 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.25)]',
          badge: 'bg-red-600 text-white animate-pulse',
          title: 'text-red-200',
          numberBtn: 'bg-red-600 hover:bg-red-500 text-white shadow-md hover:shadow-red-500/30',
          iconColor: 'text-red-400',
        };
      case 'URGENT':
        return {
          wrapper: 'bg-rose-950/60 border-rose-500/60 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
          badge: 'bg-rose-600 text-white',
          title: 'text-rose-200',
          numberBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md',
          iconColor: 'text-rose-400',
        };
      case 'WARNING':
        return {
          wrapper: 'bg-amber-950/50 border-amber-500/60 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
          badge: 'bg-amber-500 text-black font-bold',
          title: 'text-amber-200',
          numberBtn: 'bg-amber-500 hover:bg-amber-400 text-black font-semibold',
          iconColor: 'text-amber-400',
        };
      case 'INFO':
      default:
        return {
          wrapper: 'bg-sky-950/40 border-sky-500/40 text-sky-100',
          badge: 'bg-sky-600 text-white',
          title: 'text-sky-200',
          numberBtn: 'bg-sky-600 hover:bg-sky-500 text-white',
          iconColor: 'text-sky-400',
        };
    }
  };

  const styles = getSeverityStyle(severity);

  // Format telephone link
  const sanitizeTel = (num: string) => {
    return num.replace(/[^0-9+]/g, '');
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`p-4 rounded-xl border backdrop-blur-md transition-all ${styles.wrapper}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono tracking-wider uppercase font-semibold ${styles.badge}`}
          >
            {severity}
          </span>
          <span className="font-mono text-xs text-white/60 uppercase tracking-wider">
            Safety Advisory
          </span>
        </div>
        <span className="text-[10px] font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded border border-white/10">
          PROBABILISTIC CLASSIFICATION
        </span>
      </div>

      {/* Title & Message */}
      <h3 className={`text-base font-semibold tracking-tight mb-1.5 ${styles.title}`}>
        {title}
      </h3>
      <p className="text-xs leading-relaxed text-white/80 mb-3">
        {message}
      </p>

      {/* Prominent Emergency Contacts & Helplines */}
      {helplines && helplines.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-black/40 border border-white/10">
          <div className="text-[11px] font-mono uppercase tracking-wider text-white/60 mb-2 font-medium">
            Verified Emergency & Support Helplines (India)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {helplines.map((helpline, idx) => (
              <a
                key={idx}
                href={`tel:${sanitizeTel(helpline.number)}`}
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-transform active:scale-95 ${styles.numberBtn}`}
                title={`Call ${helpline.name} directly`}
              >
                <div className="flex flex-col text-left pr-2">
                  <span className="text-[11px] leading-tight opacity-90">
                    {helpline.name}
                  </span>
                  <span className="font-mono text-sm font-bold tracking-wider">
                    {helpline.number}
                  </span>
                </div>
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20 shrink-0">
                  <svg
                    className="w-4 h-4 fill-current"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Immediate Actions */}
      {immediateActions && immediateActions.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-white/70 mb-1.5 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Recommended Immediate Actions
          </div>
          <ul className="space-y-1 text-xs text-white/85">
            {immediateActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-400 font-mono text-[11px] shrink-0 mt-0.5">✓</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions to Avoid */}
      {avoidActions && avoidActions.length > 0 && (
        <div className="mb-3 p-2.5 rounded bg-black/30 border border-white/5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-rose-300/80 mb-1 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Actions to Avoid
          </div>
          <ul className="space-y-0.5 text-xs text-rose-100/80">
            {avoidActions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-rose-400 font-mono text-[11px] shrink-0 mt-0.5">✕</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Non-forensic / Non-medical Disclaimer */}
      <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-white/40 leading-relaxed">
        NOTICE: This analysis is probabilistic AI assessment and does NOT constitute medical, forensic, legal, or substance confirmation. The system does not automatically contact emergency services or transmit images.
      </div>
    </div>
  );
}
