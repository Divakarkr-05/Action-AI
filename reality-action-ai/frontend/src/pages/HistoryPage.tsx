/**
 * REALITY → ACTION AI – Analysis History Page
 *
 * View, search, inspect, restore, and delete saved analysis sessions.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  type AnalysisHistoryItem,
  deleteAnalysisFromHistory,
  fetchAnalysisHistory,
} from '../services/history';

export function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<AnalysisHistoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = useCallback(async (search?: string) => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalysisHistory(search);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadHistory(searchQuery || undefined);
    }
  }, [authLoading, loadHistory, searchQuery]);

  const handleDelete = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!window.confirm('Are you sure you want to delete this analysis?')) {
        return;
      }
      setDeletingId(id);
      try {
        const res = await deleteAnalysisFromHistory(id);
        if (res.success) {
          setItems((prev) => prev.filter((item) => item.id !== id));
          if (selectedItem?.id === id) {
            setSelectedItem(null);
          }
        } else {
          alert(res.message || 'Failed to delete');
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error deleting item');
      } finally {
        setDeletingId(null);
      }
    },
    [selectedItem],
  );

  const handleRestore = useCallback(
    (item: AnalysisHistoryItem) => {
      navigate('/', {
        state: {
          restoredAnalysis: {
            whatISee: item.whatISee ?? '',
            whatIsHappening: item.whatIsHappening ?? '',
            nextAction: item.nextAction ?? '',
            steps: item.steps ?? [],
            confidence: item.confidence ?? 0.85,
            safetyWarning: item.safetyWarning,
            imageAuthenticity: (item.imageAuthenticity as any) ?? null,
            aiGeneratedProbability: item.aiGeneratedProbability,
            authenticityConfidence: item.authenticityConfidence,
            authenticityModel: item.authenticityModel,
            authenticityIndicators: item.authenticityIndicators,
          },
          restoredQuestion: item.question ?? '',
        },
      });
    },
    [navigate],
  );

  return (
    <div className="min-h-screen bg-graphite-950 text-white">
      {/* Header bar */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/[0.06] bg-graphite-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="label-tech text-white/40 hover:text-lime-400 transition-colors uppercase flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Workspace</span>
            </Link>
            <span className="text-white/20">|</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold tracking-wider text-white">
                ANALYSIS HISTORY
              </span>
              {items.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime-400/10 border border-lime-400/30 text-lime-400">
                  {items.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <span className="label-tech text-white/40 hidden sm:inline">
                {user.email}
              </span>
            ) : (
              <Link to="/login" className="btn-primary text-xs py-1.5 px-3">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        {/* Authentication Notice */}
        {!authLoading && !user && (
          <div className="card p-8 text-center max-w-lg mx-auto mb-12 border-lime-400/20">
            <div className="w-12 h-12 rounded-xl bg-lime-400/10 border border-lime-400/30 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b8ff00" strokeWidth="1.5">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-mono font-semibold text-white mb-2">
              Sign In to View History
            </h2>
            <p className="text-white/40 text-xs font-mono mb-6">
              Saved analyses and inspection sessions are securely stored with your Supabase account.
            </p>
            <div className="flex justify-center gap-3">
              <Link to="/login" className="btn-primary text-xs">
                Sign In
              </Link>
              <Link to="/signup" className="btn-ghost text-xs">
                Create Account
              </Link>
            </div>
          </div>
        )}

        {/* User is authenticated */}
        {user && (
          <>
            {/* Search and filter controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Search previous analyses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-graphite-800 border border-white/[0.08] rounded-lg pl-9 pr-4 py-2
                             text-white text-xs font-mono placeholder:text-white/20
                             focus:outline-none focus:border-lime-400/40 focus:ring-1 focus:ring-lime-400/20
                             transition-all"
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-3 text-white/30"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadHistory(searchQuery || undefined)}
                  className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
                  title="Refresh"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="card p-4 border-red-500/20 bg-red-500/[0.05] mb-6 flex items-center justify-between">
                <span className="text-red-400 text-xs font-mono">{error}</span>
                <button
                  onClick={() => loadHistory(searchQuery || undefined)}
                  className="label-tech text-white/40 hover:text-white"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="card p-5 h-56 animate-pulse bg-graphite-800/40">
                    <div className="h-4 bg-white/[0.05] rounded w-1/3 mb-4" />
                    <div className="h-3 bg-white/[0.03] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/[0.03] rounded w-1/2 mb-6" />
                    <div className="h-10 bg-white/[0.02] rounded w-full" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && items.length === 0 && (
              <div className="card p-12 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-xl bg-graphite-800 border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
                <h3 className="font-mono text-sm text-white/70 mb-1">
                  {searchQuery ? 'No matching analyses found' : 'No saved analyses yet'}
                </h3>
                <p className="text-white/30 text-xs font-mono mb-6">
                  {searchQuery
                    ? 'Try adjusting your search terms.'
                    : 'Run an analysis in the workspace and save it to keep a log.'}
                </p>
                <Link to="/" className="btn-primary text-xs">
                  Go to Workspace
                </Link>
              </div>
            )}

            {/* Grid of history cards */}
            {!loading && items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="card p-5 cursor-pointer hover:border-lime-400/30 transition-all hover:-translate-y-0.5 group relative flex flex-col justify-between"
                  >
                    <div>
                      {/* Top bar of card */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="label-tech text-white/30 text-[10px]">
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Unknown Date'}
                        </span>
                        <div className="flex items-center gap-2">
                          {item.imageAuthenticity && (
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider font-semibold ${
                                item.imageAuthenticity === 'LIKELY_REAL'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : item.imageAuthenticity === 'LIKELY_AI_GENERATED'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              }`}
                            >
                              {item.imageAuthenticity === 'LIKELY_REAL'
                                ? 'LIKELY REAL'
                                : item.imageAuthenticity === 'LIKELY_AI_GENERATED'
                                ? 'LIKELY AI'
                                : 'UNCERTAIN'}
                            </span>
                          )}
                          {item.confidence !== null && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-lime-400/10 text-lime-400/90 border border-lime-400/20">
                              {Math.round(item.confidence * 100)}%
                            </span>
                          )}
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            disabled={deletingId === item.id}
                            className="text-white/20 hover:text-red-400 p-1 transition-colors"
                            title="Delete"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Question or prompt */}
                      {item.question && (
                        <p className="font-mono text-xs text-white/90 font-medium mb-2 line-clamp-1">
                          "{item.question}"
                        </p>
                      )}

                      {/* What I See */}
                      <p className="text-white/50 text-xs font-sans line-clamp-2 mb-3">
                        {item.whatISee || 'No description provided.'}
                      </p>

                      {/* Safety warning badge */}
                      {item.safetyWarning && (
                        <div className="mb-3 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono flex items-center gap-1.5">
                          <span>⚠</span>
                          <span className="truncate">{item.safetyWarning}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Section */}
                    <div className="pt-3 border-t border-white/[0.04] mt-2">
                      <div className="text-[10px] font-mono text-lime-400/80 mb-1 flex items-center gap-1">
                        <span>→ NEXT:</span>
                        <span className="truncate text-white/70">
                          {item.nextAction || 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-1">
                        <span className="text-[10px] font-mono text-white/30 group-hover:text-lime-400 transition-colors">
                          Click to inspect
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(item);
                          }}
                          className="label-tech text-white/40 hover:text-lime-400 text-[10px] transition-colors"
                        >
                          Load In Workspace ↗
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Detail Modal */}
        {selectedItem && (
          <div
            className="fixed inset-0 z-50 bg-graphite-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div
              className="card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-white">
                    Inspection Details
                  </h3>
                  <span className="label-tech text-white/30 text-[10px]">
                    {selectedItem.createdAt
                      ? new Date(selectedItem.createdAt).toLocaleString()
                      : ''}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-white/40 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex flex-col gap-4 text-xs font-mono">
                {selectedItem.question && (
                  <div>
                    <span className="text-white/40 block mb-1">PROMPT / GOAL</span>
                    <p className="bg-graphite-800 p-3 rounded-lg border border-white/[0.06] text-white">
                      {selectedItem.question}
                    </p>
                  </div>
                )}

                {selectedItem.safetyWarning && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    <span className="font-bold block mb-1">⚠ SAFETY WARNING</span>
                    {selectedItem.safetyWarning}
                  </div>
                )}

                <div>
                  <span className="text-white/40 block mb-1">WHAT I SEE</span>
                  <p className="text-white/80 leading-relaxed font-sans text-sm">
                    {selectedItem.whatISee}
                  </p>
                </div>

                <div>
                  <span className="text-white/40 block mb-1">WHAT IS HAPPENING</span>
                  <p className="text-white/80 leading-relaxed font-sans text-sm">
                    {selectedItem.whatIsHappening}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-lime-400/[0.05] border border-lime-400/20">
                  <span className="text-lime-400 font-bold block mb-1">NEXT ACTION</span>
                  <p className="text-white leading-relaxed font-sans text-sm font-medium">
                    {selectedItem.nextAction}
                  </p>
                </div>

                {selectedItem.steps && selectedItem.steps.length > 0 && (
                  <div>
                    <span className="text-white/40 block mb-2">STEP-BY-STEP</span>
                    <ol className="list-decimal list-inside space-y-1.5 text-white/80 font-sans text-sm">
                      {selectedItem.steps.map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {selectedItem.confidence !== null && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-white/40">Confidence Score:</span>
                    <span className="text-lime-400 font-bold">
                      {Math.round(selectedItem.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Modal footer */}
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                <button
                  onClick={(e) => handleDelete(selectedItem.id, e)}
                  disabled={deletingId === selectedItem.id}
                  className="btn-ghost text-red-400 hover:text-red-300 text-xs py-1.5 px-3"
                >
                  Delete Record
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="btn-ghost text-xs py-1.5 px-3"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleRestore(selectedItem)}
                    className="btn-primary text-xs py-1.5 px-4"
                  >
                    Open in Workspace ↗
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
