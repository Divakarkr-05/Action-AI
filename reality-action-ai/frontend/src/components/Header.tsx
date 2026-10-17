import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  aiMode?: string;
}

export function Header({ aiMode = 'mock' }: HeaderProps) {
  const isReady = aiMode === 'gemma';
  const { user, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-graphite-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-7 h-7 rounded bg-lime-400/10 border border-lime-400/30 flex items-center justify-center group-hover:border-lime-400/60 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="#b8ff00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-mono text-sm font-semibold tracking-[0.06em] text-white">
            REALITY
            <span className="text-lime-400 mx-1.5">→</span>
            ACTION AI
          </span>
        </Link>

        {/* Right Nav */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-graphite-800 border border-white/[0.06] rounded-full px-3 py-1.5">
            <span
              className={`status-dot ${
                isReady
                  ? 'bg-lime-400 animate-pulse'
                  : 'bg-yellow-400/80 animate-pulse-slow'
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50">
              {isReady ? 'GEMMA 4 CONNECTED' : 'GEMMA 4 READY'}
            </span>
          </div>

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

