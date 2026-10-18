import React, { useEffect, useState } from 'react';
import type { DiagnosticCase } from '../../types';
import { listDiagnosticCases, deleteDiagnosticCase } from '../../services/graphql';

interface RecentCasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCase: (selectedCase: DiagnosticCase) => void;
}

export const RecentCasesModal: React.FC<RecentCasesModalProps> = ({
  isOpen,
  onClose,
  onSelectCase,
}) => {
  const [cases, setCases] = useState<DiagnosticCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await listDiagnosticCases(20);
      setCases(data);
    } catch (err) {
      console.error('Failed to load recent diagnostic cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCases();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (e: React.MouseEvent, caseId: string) => {
    e.stopPropagation();
    setDeletingId(caseId);
    try {
      await deleteDiagnosticCase(caseId);
      setCases((prev) => prev.filter((c) => c.id !== caseId));
    } catch (err) {
      console.error('Failed to delete diagnostic case:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatExpiry = (expiresAtStr: string) => {
    const expires = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diffHours = Math.round((expires - now) / (1000 * 60 * 60));
    if (diffHours <= 0) return 'Expired';
    const days = Math.floor(diffHours / 24);
    const hours = diffHours % 24;
    return `${days}d ${hours}h left`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-graphite-900 border border-white/[0.1] rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
          <div>
            <h3 className="font-mono text-lg font-bold text-white flex items-center gap-2">
              <span>🗂️</span>
              <span>RECENT DIAGNOSTIC CASES</span>
            </h3>
            <p className="text-white/40 font-mono text-xs mt-1">
              Active cases retained for up to 7 days with automatic storage cleanup.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white font-mono text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {loading ? (
            <div className="py-12 text-center text-white/40 font-mono text-xs">
              Loading recent diagnostic cases...
            </div>
          ) : cases.length === 0 ? (
            <div className="py-12 text-center text-white/40 font-mono text-xs">
              No active diagnostic cases found. Upload an image to initialize one.
            </div>
          ) : (
            cases.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onSelectCase(c);
                  onClose();
                }}
                className="group p-4 rounded-xl bg-graphite-950/80 border border-white/[0.06] hover:border-lime-400/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  {c.initialImageUrl ? (
                    <img
                      src={c.initialImageUrl}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover border border-white/10 shrink-0 bg-black"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-graphite-800 border border-white/10 flex items-center justify-center shrink-0 text-lg">
                      ⚡
                    </div>
                  )}

                  <div>
                    <h4 className="font-mono text-sm font-bold text-white group-hover:text-lime-400 transition-colors">
                      {c.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-white/50 mt-1">
                      <span className="text-lime-400 font-semibold">{c.currentState}</span>
                      <span>·</span>
                      <span>{Math.round(c.investigationProgress * 100)}% progress</span>
                      <span>·</span>
                      <span className="text-amber-400/80">{formatExpiry(c.expiresAt)}</span>
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-1">
                      ID: {c.id}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => {
                      onSelectCase(c);
                      onClose();
                    }}
                    className="btn-primary py-1.5 px-3.5 text-xs font-mono uppercase"
                  >
                    CONTINUE
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, c.id)}
                    disabled={deletingId === c.id}
                    className="btn-ghost py-1.5 px-3 text-xs font-mono hover:text-red-400 text-white/40"
                  >
                    {deletingId === c.id ? 'Deleting...' : 'DELETE'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
