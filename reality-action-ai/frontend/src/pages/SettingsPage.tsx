import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { TopBar } from '../components/navigation/TopBar';
import { CommandPalette } from '../components/CommandPalette';
import { useAuth } from '../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [technicianDefault, setTechnicianDefault] = useState(true);
  const [purgeSuccess, setPurgeSuccess] = useState(false);

  const handlePurgeTemporaryCases = () => {
    if (confirm('Are you sure you want to delete all temporary 7-day diagnostic cases? This cannot be undone.')) {
      try {
        localStorage.removeItem('reality_ai_diagnostic_cases');
        setPurgeSuccess(true);
        setTimeout(() => setPurgeSuccess(false), 3000);
      } catch (err) {
        console.error('Failed to purge local cases:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-graphite-950 text-white">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onStartNewDiagnosis={() => navigate('/')}
        onOpenCases={() => navigate('/')}
      />

      <TopBar
        isSidebarCollapsed={isSidebarCollapsed}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onStartNewDiagnosis={() => navigate('/')}
      />

      <main
        className={`pt-20 pb-16 px-4 sm:px-8 transition-all duration-300 ${
          isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          {/* Header */}
          <div className="border-b border-white/[0.08] pb-5">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
              Settings &amp; Workspace Configuration
            </h1>
            <p className="text-white/50 text-sm font-light">
              Manage data retention, privacy policies, AI diagnostic integrations, and interface preferences.
            </p>
          </div>

          {/* 1. Account Section */}
          <section className="bg-graphite-900 border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-lime-400 font-mono text-xs uppercase tracking-wider font-bold">
              <span>👤</span>
              <span>ACCOUNT &amp; AUTHENTICATION</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-white/[0.06]">
              <div>
                <div className="text-sm font-mono text-white">
                  {user ? user.email : 'Guest Session (Unauthenticated)'}
                </div>
                <div className="text-xs text-white/40">
                  {user ? 'Authenticated via Supabase Auth' : 'Signed out · Cases stored in temporary browser session'}
                </div>
              </div>

              {user ? (
                <button
                  onClick={() => signOut()}
                  className="btn-ghost text-xs py-2 px-4 hover:text-red-400 border-red-500/20"
                >
                  Sign Out
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  className="btn-primary text-xs py-2 px-4"
                >
                  Sign In / Sign Up
                </button>
              )}
            </div>
          </section>

          {/* 2. Privacy & 7-Day Diagnostic Retention */}
          <section className="bg-graphite-900 border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-lime-400 font-mono text-xs uppercase tracking-wider font-bold">
              <span>🛡️</span>
              <span>DIAGNOSTIC IMAGE RETENTION &amp; PRIVACY</span>
            </div>

            <div className="p-4 rounded-lg bg-graphite-950/70 border border-white/[0.04] space-y-2 text-xs font-mono text-white/80 leading-relaxed">
              <div className="text-white font-bold text-sm mb-1">
                7-Day Temporary Storage Policy
              </div>
              <p>
                Your active diagnostic cases and uploaded PCB photos are kept for up to{' '}
                <span className="text-lime-400 font-bold">7 days</span>. This ensures you can source spare components, run safe physical multimeter tests, and return to verify repairs without losing context.
              </p>
              <p className="text-white/50">
                After 7 days, temporary case context is automatically expired. Saved historical analyses in your History tab remain permanent until you delete them.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div>
                <div className="text-xs font-mono text-white font-semibold">
                  Purge Active Diagnostic Cases
                </div>
                <div className="text-[11px] text-white/40 font-mono">
                  Immediately clear all active 7-day cases from local storage.
                </div>
              </div>

              <button
                onClick={handlePurgeTemporaryCases}
                className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-xs transition-colors shrink-0 cursor-pointer"
              >
                Delete All Temporary Cases
              </button>
            </div>

            {purgeSuccess && (
              <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                ✓ All temporary diagnostic cases have been purged.
              </div>
            )}
          </section>

          {/* 3. AI Diagnostic Engine & Detectra Integration */}
          <section className="bg-graphite-900 border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-lime-400 font-mono text-xs uppercase tracking-wider font-bold">
              <span>🧠</span>
              <span>AI PROCESSING &amp; MODEL INTEGRATIONS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3.5 rounded-lg bg-graphite-950/70 border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-bold">Multimodal AI</span>
                  <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
                </div>
                <div className="text-lime-400 text-[11px] mb-1">Sarvam AI / Gemma 4</div>
                <p className="text-white/40 text-[11px]">
                  Reasoning engine for spatial bounding boxes, hypotheses, and tests.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-graphite-950/70 border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-bold">Authenticity</span>
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                </div>
                <div className="text-cyan-400 text-[11px] mb-1">Detectra v3 ONNX</div>
                <p className="text-white/40 text-[11px]">
                  In-browser WebGPU / WASM forensic verification against AI spoofing.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-graphite-950/70 border border-white/[0.04]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-bold">RAG Knowledge</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-emerald-400 text-[11px] mb-1">Electronics Corpus</div>
                <p className="text-white/40 text-[11px]">
                  Curated failure modes, multimeter procedures, and safety specs.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Appearance & Accessibility */}
          <section className="bg-graphite-900 border border-white/[0.08] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-lime-400 font-mono text-xs uppercase tracking-wider font-bold">
              <span>♿</span>
              <span>ACCESSIBILITY &amp; WORKSPACE PREFERENCES</span>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <label className="flex items-center justify-between py-2 border-b border-white/[0.06] cursor-pointer">
                <div>
                  <div className="text-white font-semibold">Reduced Motion Mode</div>
                  <div className="text-white/40 text-[11px]">
                    Minimize animations and transitions across diagnostic workspaces.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                  className="w-4 h-4 accent-lime-400 rounded"
                />
              </label>

              <label className="flex items-center justify-between py-2 cursor-pointer">
                <div>
                  <div className="text-white font-semibold">Default to Technician Mode</div>
                  <div className="text-white/40 text-[11px]">
                    Show comprehensive epistemic evidence and test metrics by default.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={technicianDefault}
                  onChange={(e) => setTechnicianDefault(e.target.checked)}
                  className="w-4 h-4 accent-lime-400 rounded"
                />
              </label>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
