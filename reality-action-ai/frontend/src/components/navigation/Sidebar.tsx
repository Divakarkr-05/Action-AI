import React from 'react';
import { NavLink } from 'react-router-dom';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onStartNewDiagnosis?: () => void;
  onOpenCases?: () => void;
  activeCaseCount?: number;
}

interface NavItem {
  to?: string;
  action?: () => void;
  label: string;
  badge?: string;
  icon: React.ReactNode;
  end?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onStartNewDiagnosis,
  onOpenCases,
  activeCaseCount = 0,
}) => {
  const navItems: NavItem[] = [
    {
      to: '/',
      label: 'Dashboard',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      end: true,
    },
    {
      action: onStartNewDiagnosis,
      label: 'New Diagnosis',
      badge: '+',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
    },
    {
      action: onOpenCases,
      label: 'Cases',
      badge: activeCaseCount > 0 ? `${activeCaseCount}` : undefined,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      ),
    },
    {
      to: '/history',
      label: 'History',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      to: '/knowledge',
      label: 'Knowledge',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      ),
    },
  ];

  const content = (
    <div className="h-full flex flex-col justify-between p-3">
      {/* Top Header / Branding */}
      <div>
        <div className="flex items-center justify-between px-2 py-3 mb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-lime-400/40 flex items-center justify-center flex-shrink-0 bg-black">
              <img src="/logo.png" alt="Reality AI Logo" className="w-full h-full object-cover" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <span className="font-mono text-xs font-bold tracking-wider text-white block">
                  REALITY<span className="text-lime-400">-</span>AI
                </span>
                <span className="text-[9px] font-mono text-white/40 block tracking-widest uppercase">
                  AI WORKSPACE
                </span>
              </div>
            )}
          </div>

          {/* Collapse Toggle (Desktop only) */}
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            if (item.to) {
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.end}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-medium transition-all ${
                      isActive
                        ? 'bg-lime-400/10 text-lime-400 border border-lime-400/30 shadow-glow-lime-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                    } ${isCollapsed ? 'justify-center' : ''}`
                  }
                  title={item.label}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-lime-400/20 text-lime-300">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            }

            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.action) item.action();
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono font-medium text-white/60 hover:text-white hover:bg-white/[0.04] transition-all cursor-pointer ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={item.label}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}
                {!isCollapsed && item.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.08] text-white/60">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Tagline / Status */}
      <div className="pt-4 border-t border-white/[0.06]">
        {!isCollapsed ? (
          <div className="px-2 py-2 rounded-lg bg-graphite-900 border border-white/[0.04]">
            <div className="text-[10px] font-mono text-lime-400/80 font-bold uppercase tracking-wider mb-1">
              ENGINE PRINCIPLE
            </div>
            <p className="text-[10px] font-mono text-white/50 leading-relaxed">
              SEE THE FAULT.<br />
              TEST THE CAUSE.<br />
              VERIFY THE FIX.
            </p>
          </div>
        ) : (
          <div className="flex justify-center text-lime-400 text-xs" title="SEE THE FAULT. TEST THE CAUSE. VERIFY THE FIX.">
            ⚡
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed top-0 left-0 bottom-0 z-40 bg-graphite-950 border-r border-white/[0.08] transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation sidebar drawer"
          className="md:hidden fixed inset-0 z-50 bg-graphite-950/80 backdrop-blur-sm animate-fade-in"
          onClick={onCloseMobile}
        >
          <div
            className="w-72 h-full bg-graphite-950 border-r border-white/[0.1] shadow-2xl animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      )}
    </>
  );
};
