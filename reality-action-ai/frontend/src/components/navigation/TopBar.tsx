import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAIProviderStatus } from '../../hooks/useAIProviderStatus';
import type { DiagnosticCase } from '../../types';

export interface TopBarProps {
  isSidebarCollapsed: boolean;
  onOpenMobileMenu: () => void;
  onOpenCommandPalette: () => void;
  activeCase?: DiagnosticCase | null;
  onJumpToActiveCase?: () => void;
  aiMode?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  isSidebarCollapsed,
  onOpenMobileMenu,
  onOpenCommandPalette,
  activeCase,
  onJumpToActiveCase,
}) => {
  const { user, signOut } = useAuth();
  const aiStatus = useAIProviderStatus();

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-14 border-b border-white/[0.08] bg-graphite-950/90 backdrop-blur-md transition-all duration-300 ease-in-out left-0 ${
        isSidebarCollapsed ? 'md:left-20' : 'md:left-64'
      }`}
    >
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + active case / breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Active Case Indicator Pill */}
          {activeCase && (
            <button
              onClick={onJumpToActiveCase}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400 font-mono text-xs hover:bg-lime-400/20 transition-colors truncate cursor-pointer"
              title={`Active Diagnostic Case: ${activeCase.title}`}
            >
              <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse flex-shrink-0" />
              <span className="truncate max-w-[150px] sm:max-w-xs font-semibold">
                {activeCase.title}
              </span>
              <span className="text-[10px] text-lime-400/60 uppercase hidden sm:inline">
                [{activeCase.currentState.replace(/_/g, ' ')}]
              </span>
            </button>
          )}
        </div>

        {/* Center: Command Palette Trigger */}
        <div className="flex-1 max-w-md hidden sm:block">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-graphite-900 border border-white/[0.08] text-white/40 hover:text-white/80 hover:border-white/20 transition-all font-mono text-xs cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>Quick diagnostic search or actions...</span>
            </span>
            <kbd className="text-[10px] bg-graphite-800 border border-white/[0.1] px-1.5 py-0.5 rounded text-white/50">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Engine Status + Auth */}
        <div className="flex items-center gap-3">
          {/* Mobile Command button */}
          <button
            onClick={onOpenCommandPalette}
            aria-label="Open command search"
            className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* AI Provider Status */}
          <div
            className="hidden lg:flex items-center gap-2 bg-graphite-900 border border-white/[0.06] rounded-full px-3 py-1 cursor-default transition-all"
            title={aiStatus.tooltipText}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${aiStatus.dotClass}`} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/70">
              {aiStatus.badgeText}
            </span>
          </div>

          {/* User Auth */}
          {user ? (
            <div className="flex items-center gap-2.5 pl-2 border-l border-white/[0.08]">
              <span
                className="font-mono text-xs text-white/50 max-w-[120px] truncate hidden md:inline"
                title={user.email}
              >
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="px-2.5 py-1 text-xs font-mono text-white/50 hover:text-red-400 transition-colors rounded hover:bg-red-500/[0.08]"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
              <Link
                to="/login"
                className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-lime-400 text-graphite-950 hover:bg-lime-300 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
