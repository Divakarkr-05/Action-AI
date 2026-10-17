/**
 * LoadingState – Displayed while the AI analysis is running.
 */

export function LoadingState() {
  const steps = [
    'Processing image...',
    'Identifying visual elements...',
    'Analysing situation...',
    'Generating action steps...',
  ];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 animate-fade-in">
      {/* Animated graphic */}
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-xl border border-lime-400/20 bg-graphite-800 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-lime-400/60">
            <path d="M14 3a11 11 0 100 22A11 11 0 0014 3z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeDasharray="4 4"/>
            <path d="M14 7v7l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        {/* Spinning ring */}
        <div className="absolute inset-0 rounded-xl border border-lime-400/30 border-t-lime-400
                        animate-spin" style={{ animationDuration: '1.5s' }} />
        {/* Outer glow */}
        <div className="absolute -inset-3 rounded-2xl border border-lime-400/10 animate-pulse-slow" />
      </div>

      <p className="font-mono text-sm text-white/60 uppercase tracking-[0.12em] mb-6">
        Analysing Reality
      </p>

      {/* Step list */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {steps.map((step, i) => (
          <div
            key={step}
            className="flex items-center gap-3 animate-fade-in"
            style={{ animationDelay: `${i * 0.4}s`, opacity: 0, animationFillMode: 'forwards' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-lime-400/60 animate-pulse-slow flex-shrink-0" />
            <span className="text-white/40 text-xs font-mono">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
