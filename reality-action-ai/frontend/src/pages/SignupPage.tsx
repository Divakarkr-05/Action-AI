/**
 * REALITY → ACTION AI – Sign Up Page
 *
 * Consistent with the graphite/lime technical visual theme.
 */

import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccessMessage(null);

      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      setIsLoading(true);
      const { error: signUpError } = await signUp(email, password);
      setIsLoading(false);

      if (signUpError) {
        setError(signUpError);
      } else {
        setSuccessMessage(
          'Account created! If email confirmation is enabled, please check your inbox. Redirecting to workspace...',
        );
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      }
    },
    [email, password, confirmPassword, signUp, navigate],
  );

  return (
    <div className="min-h-screen bg-graphite-950 flex items-center justify-center px-4">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-lime-400/10 border border-lime-400/30 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="#b8ff00"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="font-mono text-lg font-semibold tracking-[0.06em] text-white">
              REALITY
              <span className="text-lime-400 mx-1.5">→</span>
              ACTION AI
            </span>
          </div>
          <p className="text-white/30 font-mono text-xs tracking-[0.12em] uppercase">
            Create an account to persist analysis history
          </p>
        </div>

        {/* Card */}
        <div className="card p-8 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-lime-400/5 rounded-full blur-3xl pointer-events-none" />

          <h2 className="section-title mb-6">Create Account</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="label-tech block mb-2">
                Email
              </label>
              <input
                id="signup-email"
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
              <label htmlFor="signup-password" className="label-tech block mb-2">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-graphite-700 border border-white/[0.08] rounded-lg px-4 py-3
                           text-white text-sm font-mono placeholder:text-white/20
                           focus:outline-none focus:border-lime-400/40 focus:ring-1 focus:ring-lime-400/20
                           transition-all"
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="signup-confirm" className="label-tech block mb-2">
                Confirm Password
              </label>
              <input
                id="signup-confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-graphite-700 border border-white/[0.08] rounded-lg px-4 py-3
                           text-white text-sm font-mono placeholder:text-white/20
                           focus:outline-none focus:border-lime-400/40 focus:ring-1 focus:ring-lime-400/20
                           transition-all"
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/[0.08] border border-red-500/20 rounded-lg px-4 py-3 animate-fade-in">
                <p className="text-red-400 text-xs font-mono">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-lime-400/[0.08] border border-lime-400/20 rounded-lg px-4 py-3 animate-fade-in">
                <p className="text-lime-400 text-xs font-mono">{successMessage}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-3.5 h-3.5 border-2 border-graphite-950/30 border-t-graphite-950 rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="tech-divider" />

          {/* Sign in link */}
          <p className="text-center text-white/30 text-xs font-mono">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-lime-400/70 hover:text-lime-400 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Version */}
        <p className="text-center mt-6 label-tech">v0.1.0</p>
      </div>
    </div>
  );
}
