import { useEffect, useState } from 'react';

interface LoadingStateProps {
  message?: string;
  isDiagnostic?: boolean;
}

export function LoadingState({ message, isDiagnostic = false }: LoadingStateProps) {
  const steps = isDiagnostic
    ? [
        'Analyzing circuit image...',
        'Checking image quality & Detectra authenticity...',
        'Identifying visible electronic components...',
        'Retrieving diagnostic failure knowledge...',
        'Building competing failure hypotheses...',
        'Preparing best discriminating test procedure...',
      ]
    : [
        'Processing visual input...',
        'Checking image authenticity...',
        'Identifying anomalies and features...',
        'Retrieving domain troubleshooting knowledge...',
        'Generating verified action steps...',
      ];

  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1200);
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 animate-fade-in text-center">
      {/* Animated diagnostic scanning icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl border border-lime-400/30 bg-graphite-900 flex items-center justify-center shadow-lg shadow-lime-400/10">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-lime-400">
            <path
              d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        {/* Spinning indicator ring */}
        <div
          className="absolute inset-0 rounded-2xl border-2 border-lime-400/20 border-t-lime-400 animate-spin"
          style={{ animationDuration: '1.2s' }}
        />
        <div className="absolute -inset-2 rounded-3xl border border-lime-400/10 animate-pulse-slow" />
      </div>

      <h3 className="font-mono text-sm text-white font-bold uppercase tracking-wider mb-1">
        {message || (isDiagnostic ? 'Synthesizing Diagnostic Model' : 'Analyzing Reality')}
      </h3>
      <p className="text-xs font-mono text-white/40 mb-6">
        Gemma 4 Multimodal Reasoning &amp; Context Retrieval
      </p>

      {/* Step sequence */}
      <div className="flex flex-col gap-2.5 w-full max-w-sm text-left">
        {steps.map((step, idx) => {
          const isDone = idx < activeStepIndex;
          const isCurrent = idx === activeStepIndex;
          return (
            <div
              key={step}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-mono text-xs transition-all ${
                isCurrent
                  ? 'bg-lime-400/10 border border-lime-400/30 text-lime-400 shadow-glow-lime-sm'
                  : isDone
                  ? 'text-white/70'
                  : 'text-white/20'
              }`}
            >
              <span className="w-4 text-center shrink-0">
                {isDone ? '✓' : isCurrent ? '●' : '○'}
              </span>
              <span className="truncate">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
