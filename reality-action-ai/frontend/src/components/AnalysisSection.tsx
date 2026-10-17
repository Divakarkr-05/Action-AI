/**
 * AnalysisSection – A single labeled section within the AnalysisPanel.
 * Provides consistent section headings with the lime bar style.
 */

import type { ReactNode } from 'react';

interface AnalysisSectionProps {
  title: string;
  children: ReactNode;
  highlight?: boolean;
  className?: string;
}

export function AnalysisSection({
  title,
  children,
  highlight = false,
  className = '',
}: AnalysisSectionProps) {
  return (
    <div className={`${className}`}>
      <h3 className="section-title">{title}</h3>
      {highlight ? (
        <div className="p-3.5 rounded-xl bg-lime-400/[0.07] border border-lime-400/20 glow-border-lime">
          <p className="text-lime-300/90 text-sm leading-relaxed font-medium">{children}</p>
        </div>
      ) : (
        <div className="text-white/65 text-sm leading-relaxed">{children}</div>
      )}
    </div>
  );
}
