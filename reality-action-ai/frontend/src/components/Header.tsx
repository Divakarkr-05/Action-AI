import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAIProviderStatus } from '../hooks/useAIProviderStatus';

interface HeaderProps {
  aiMode?: string;
  onOpenRecentCases?: () => void;
}

export function Header({ onOpenRecentCases }: HeaderProps) {
  const aiStatus = useAIProviderStatus();
  const { user, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-graphite-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-lime-400/40 flex items-center justify-center group-hover:border-lime-400/80 transition-colors bg-black flex-shrink-0">
            <img src="/logo.png" alt="Reality AI Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-[0.06em] text-white">
            REALITY<span className="text-lime-400">-</span>AI
          </span>
        </Link>

        {/* Right Nav */}
        <div className="flex items-center gap-4">
          <div
            className="hidden sm:flex items-center gap-2 bg-graphite-800 border border-white/[0.06] rounded-full px-3 py-1.5 cursor-default transition-all"
            title={aiStatus.tooltipText}
          >
            <span className={`status-dot ${aiStatus.dotClass}`} />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/70">
              {aiStatus.badgeText}
            </span>
          </div>

          {/* Recent 7-Day Diagnostic Cases */}
          {onOpenRecentCases && (
            <button
              onClick={onOpenRecentCases}
              className="label-tech text-white/60 hover:text-lime-400 transition-colors flex items-center gap-1.5"
            >
              <span>🗂️</span>
              <span className="hidden sm:inline">Cases</span>
            </button>
          )}

          {/* History link */}
          <Link
            to="/history"
            className="label-tech text-white/60 hover:text-lime-400 transition-colors flex items-center gap-1.5"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="hidden sm:inline">History</span>
          </Link>

          {/* Auth section */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-white/[0.08]">
              <span className="label-tech text-white/40 max-w-[120px] truncate hidden md:inline" title={user.email}>
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="btn-ghost text-xs py-1 px-2.5 hover:text-red-400"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
              <Link to="/login" className="btn-primary text-xs py-1 px-3">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

