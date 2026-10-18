/**
 * VisualFaultMap – Interactive SVG bounding-box overlay and inspection map
 * for localized electronic hardware defects, component damage, and anomalies.
 */

import { useState } from 'react';
import type { VisualFault } from '../types';

interface VisualFaultMapProps {
  imageUrl: string;
  imageAlt?: string;
  faults?: VisualFault[] | null;
  selectedFaultId?: string | null;
  onSelectFault?: (faultId: string | null) => void;
  className?: string;
}

export function VisualFaultMap({
  imageUrl,
  imageAlt = 'Hardware inspection target',
  faults = [],
  selectedFaultId = null,
  onSelectFault,
  className = '',
}: VisualFaultMapProps) {
  const [showOverlay, setShowOverlay] = useState(true);
  const [hoveredFaultId, setHoveredFaultId] = useState<string | null>(null);

  const activeFaults = faults || [];
  const hasFaults = activeFaults.length > 0;

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return {
          stroke: '#f43f5e', // rose-500
          fill: 'rgba(244, 63, 94, 0.15)',
          badgeBg: 'bg-rose-500/20',
          badgeText: 'text-rose-400',
          badgeBorder: 'border-rose-500/40',
          glow: 'rgba(244, 63, 94, 0.4)',
        };
      case 'INFO':
        return {
          stroke: '#06b6d4', // cyan-500
          fill: 'rgba(6, 182, 212, 0.12)',
          badgeBg: 'bg-cyan-500/20',
          badgeText: 'text-cyan-400',
          badgeBorder: 'border-cyan-500/40',
          glow: 'rgba(6, 182, 212, 0.3)',
        };
      case 'WARNING':
      default:
        return {
          stroke: '#f59e0b', // amber-500
          fill: 'rgba(245, 158, 11, 0.14)',
          badgeBg: 'bg-amber-500/20',
          badgeText: 'text-amber-400',
          badgeBorder: 'border-amber-500/40',
          glow: 'rgba(245, 158, 11, 0.35)',
        };
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden border border-white/[0.08] bg-graphite-950 select-none group ${className}`}>
      {/* ── Top-Right HUD Controls Bar ── */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        {hasFaults && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-graphite-900/90 backdrop-blur-md border border-white/10 text-xs font-mono shadow-lg">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="text-white/80 font-semibold">{activeFaults.length}</span>
            <span className="text-white/40">{activeFaults.length === 1 ? 'fault detected' : 'faults detected'}</span>
          </div>
        )}

        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-xs font-mono font-medium transition-all shadow-lg ${
            showOverlay
              ? 'bg-lime-400/20 border-lime-400/50 text-lime-400 shadow-lime-500/10'
              : 'bg-graphite-900/80 border-white/15 text-white/50 hover:text-white/80'
          }`}
          title="Toggle visual fault highlighting map"
          aria-label="Toggle visual fault map overlay"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
          <span>MAP: {showOverlay ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* ── Main Base Image ── */}
      <div className="relative w-full flex items-center justify-center bg-graphite-950">
        <img
          src={imageUrl}
          alt={imageAlt}
          className="w-full h-auto max-h-[520px] object-contain block"
        />

        {/* ── Interactive SVG Bounding Box Overlay ── */}
        {showOverlay && hasFaults && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-auto"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="box-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {activeFaults.map((fault) => {
              const colors = getSeverityColor(fault.severity);
              const isSelected = selectedFaultId === fault.id;
              const isHovered = hoveredFaultId === fault.id;
              const isSpotlight = isSelected || isHovered;

              // Convert normalized coordinates (0.0 - 1.0) to SVG viewbox (0 - 1000)
              const x = fault.xmin * 1000;
              const y = fault.ymin * 1000;
              const width = Math.max(20, (fault.xmax - fault.xmin) * 1000);
              const height = Math.max(20, (fault.ymax - fault.ymin) * 1000);

              // Corner reticle size
              const cornerSize = Math.min(24, width * 0.25, height * 0.25);

              return (
                <g
                  key={fault.id}
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => onSelectFault?.(isSelected ? null : fault.id)}
                  onMouseEnter={() => setHoveredFaultId(fault.id)}
                  onMouseLeave={() => setHoveredFaultId(null)}
                >
                  {/* Bounding box area */}
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={isSpotlight ? colors.fill : 'rgba(0, 0, 0, 0.05)'}
                    stroke={colors.stroke}
                    strokeWidth={isSpotlight ? 3.5 : 2}
                    strokeDasharray={isSpotlight ? 'none' : '6 3'}
                    filter={isSpotlight ? 'url(#box-glow)' : undefined}
                    rx="4"
                    className="transition-all duration-200"
                  />

                  {/* Corner Reticles (Cyberpunk/Military Tech HUD style) */}
                  {/* Top-Left */}
                  <path
                    d={`M ${x} ${y + cornerSize} L ${x} ${y} L ${x + cornerSize} ${y}`}
                    stroke={colors.stroke}
                    strokeWidth={isSpotlight ? 4 : 2.5}
                    fill="none"
                  />
                  {/* Top-Right */}
                  <path
                    d={`M ${x + width - cornerSize} ${y} L ${x + width} ${y} L ${x + width} ${y + cornerSize}`}
                    stroke={colors.stroke}
                    strokeWidth={isSpotlight ? 4 : 2.5}
                    fill="none"
                  />
                  {/* Bottom-Left */}
                  <path
                    d={`M ${x} ${y + height - cornerSize} L ${x} ${y + height} L ${x + cornerSize} ${y + height}`}
                    stroke={colors.stroke}
                    strokeWidth={isSpotlight ? 4 : 2.5}
                    fill="none"
                  />
                  {/* Bottom-Right */}
                  <path
                    d={`M ${x + width - cornerSize} ${y + height} L ${x + width} ${y + height} L ${x + width} ${y + height - cornerSize}`}
                    stroke={colors.stroke}
                    strokeWidth={isSpotlight ? 4 : 2.5}
                    fill="none"
                  />

                  {/* Center Target Reticle Crosshair when selected */}
                  {isSpotlight && (
                    <g opacity="0.8">
                      <line
                        x1={x + width / 2 - 8}
                        y1={y + height / 2}
                        x2={x + width / 2 + 8}
                        y2={y + height / 2}
                        stroke={colors.stroke}
                        strokeWidth="2"
                      />
                      <line
                        x1={x + width / 2}
                        y1={y + height / 2 - 8}
                        x2={x + width / 2}
                        y2={y + height / 2 + 8}
                        stroke={colors.stroke}
                        strokeWidth="2"
                      />
                      <circle
                        cx={x + width / 2}
                        cy={y + height / 2}
                        r="12"
                        stroke={colors.stroke}
                        strokeWidth="1.5"
                        fill="none"
                        strokeDasharray="4 2"
                      />
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* ── HTML Floating Tooltip Pills (HTML rendered on top of SVG for crisp typography) ── */}
        {showOverlay && hasFaults && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {activeFaults.map((fault) => {
              const colors = getSeverityColor(fault.severity);
              const isSelected = selectedFaultId === fault.id;
              const isHovered = hoveredFaultId === fault.id;
              const isSpotlight = isSelected || isHovered;

              // Placement percentage
              const leftPct = fault.xmin * 100;
              const topPct = fault.ymin * 100;
              const isNearTop = fault.ymin < 0.12;

              return (
                <div
                  key={`label-${fault.id}`}
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    top: isNearTop ? `${(fault.ymax * 100) + 1}%` : `${topPct}%`,
                    transform: isNearTop ? 'translateY(4px)' : 'translateY(-105%)',
                  }}
                  className={`pointer-events-auto transition-all duration-200 z-20 ${
                    isSpotlight ? 'scale-105 z-30' : 'opacity-85 hover:opacity-100'
                  }`}
                  onClick={() => onSelectFault?.(isSelected ? null : fault.id)}
                  onMouseEnter={() => setHoveredFaultId(fault.id)}
                  onMouseLeave={() => setHoveredFaultId(null)}
                >
                  <div
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold border backdrop-blur-md shadow-lg cursor-pointer ${
                      colors.badgeBg
                    } ${colors.badgeBorder} ${colors.badgeText} ${
                      isSpotlight ? 'ring-2 ring-white/30' : ''
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        fault.severity === 'CRITICAL'
                          ? 'bg-rose-400 animate-pulse'
                          : fault.severity === 'INFO'
                          ? 'bg-cyan-400'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span className="truncate max-w-[180px]">{fault.componentLabel}</span>
                  </div>

                  {/* Expanded description tooltip on hover or active selection */}
                  {isSpotlight && fault.description && (
                    <div className="mt-1 px-2.5 py-1.5 rounded bg-graphite-900/95 border border-white/20 text-[11px] font-mono text-white/90 shadow-2xl max-w-[260px] backdrop-blur-lg">
                      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-white/40 mb-0.5">
                        <span>SUSPECT COMPONENT</span>
                        <span className={colors.badgeText}>{fault.severity}</span>
                      </div>
                      <p className="leading-snug">{fault.description}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom HUD Footer ── */}
      <div className="p-3 bg-graphite-950/95 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-white/50">
        <div className="flex items-center gap-2">
          <span className="label-tech text-lime-400/70 uppercase">VISUAL FAULT ENGINE</span>
          <span className="text-white/20">|</span>
          <span>{hasFaults ? 'Click component to spotlight' : 'No localized defects detected'}</span>
        </div>
        {selectedFaultId && (
          <button
            onClick={() => onSelectFault?.(null)}
            className="text-[11px] text-white/40 hover:text-white/80 uppercase underline decoration-dotted transition-colors"
          >
            Clear Spotlight ×
          </button>
        )}
      </div>
    </div>
  );
}
