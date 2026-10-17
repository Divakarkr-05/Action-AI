/**
 * StepList – Renders numbered actionable steps with subtle styling.
 */

interface StepListProps {
  steps: string[];
}

export function StepList({ steps }: StepListProps) {
  return (
    <div className="flex flex-col gap-2">
      {steps.map((step, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 rounded-lg bg-graphite-700/50 border border-white/[0.04]
                     hover:border-lime-400/15 hover:bg-graphite-700/80 transition-all duration-200
                     animate-fade-in"
          style={{ animationDelay: `${index * 0.07}s`, opacity: 0, animationFillMode: 'forwards' }}
        >
          {/* Step number */}
          <span className="flex-shrink-0 font-mono text-[10px] font-semibold text-lime-400/60
                           bg-lime-400/10 border border-lime-400/15 rounded px-1.5 py-0.5
                           mt-0.5 tracking-wider min-w-[32px] text-center">
            {String(index + 1).padStart(2, '0')}
          </span>

          {/* Step text */}
          <p className="text-white/75 text-sm leading-relaxed font-light">{step}</p>
        </div>
      ))}
    </div>
  );
}
