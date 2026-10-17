/**
 * REALITY → ACTION AI – Login Page
 *
 * Styled consistently with the graphite/lime visual theme.
 */

import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsLoading(true);

      const { error: signInError } = await signIn(email, password);
      setIsLoading(false);

      if (signInError) {
        setError(signInError);
      } else {
        navigate('/', { replace: true });
      }
    },
    [email, password, signIn, navigate],
  );

  return (
    <div className="min-h-screen bg-graphite-950 flex items-center justify-center px-4">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-lime-400/10 border border-lime-400/30 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="#b8ff00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-mono text-lg font-semibold tracking-[0.06em] text-white">
              REALITY
              <span className="text-lime-400 mx-1.5">→</span>
              ACTION AI
            </span>
          </div>
          <p className="text-white/30 font-mono text-xs tracking-[0.12em] uppercase">
            Turn what you see into what you can do.
          </p>
        </div>

        {/* Card */}
        <div className="card p-8 relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-lime-400/5 rounded-full blur-3xl pointer-events-none" />

          <h2 className="section-title mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="label-tech block mb-2"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-graphite-700 border border-white/[0.08] rounded-lg px-4 py-3
                           text-white text-sm font-mono placeholder:text-white/20
                           focus:outline-none focus:border-lime-400/40 focus:ring-1 focus:ring-lime-400/20
                           transition-all"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="label-tech block mb-2"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-graphite-700 border border-white/[0.08] rounded-lg px-4 py-3
                           text-white text-sm font-mono placeholder:text-white/20
                           focus:outline-none focus:border-lime-400/40 focus:ring-1 focus:ring-lime-400/20
                           transition-all"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/[0.08] border border-red-500/20 rounded-lg px-4 py-3 animate-fade-in">
                <p className="text-red-400 text-xs font-mono">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-1"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-graphite-950/30 border-t-graphite-950 rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="tech-divider" />

          {/* Sign up link */}
          <p className="text-center text-white/30 text-xs font-mono">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-lime-400/70 hover:text-lime-400 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Version */}
        <p className="text-center mt-6 label-tech">v0.1.0</p>
      </div>
    </div>
  );
}
