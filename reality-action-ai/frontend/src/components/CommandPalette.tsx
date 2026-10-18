import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Actions' | 'Navigation' | 'Diagnostic';
  shortcut?: string;
  icon: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onStartNewDiagnosis?: () => void;
  onOpenRecentCases?: () => void;
  onSimulateDemoCase?: () => void;
  hasActiveCase?: boolean;
  onContinueActiveCase?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onStartNewDiagnosis,
  onOpenRecentCases,
  onSimulateDemoCase,
  hasActiveCase,
  onContinueActiveCase,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const commands: CommandItem[] = [
    {
      id: 'new-diagnosis',
      title: 'Start New Diagnosis',
      subtitle: 'Upload a PCB photo, component, or circuit to begin investigation',
      category: 'Actions',
      shortcut: 'N',
      icon: '⚡',
      onSelect: () => {
        onClose();
        if (onStartNewDiagnosis) onStartNewDiagnosis();
        else navigate('/');
      },
    },
    ...(hasActiveCase && onContinueActiveCase
      ? [
          {
            id: 'continue-active',
            title: 'Continue Active Diagnosis',
            subtitle: 'Jump back to your ongoing investigation and next action',
            category: 'Diagnostic' as const,
            shortcut: 'C',
            icon: '🎯',
            onSelect: () => {
              onClose();
              onContinueActiveCase();
            },
          },
        ]
      : []),
    {
      id: 'recent-cases',
      title: 'Open Recent Cases (7-Day TTL)',
      subtitle: 'Browse your temporary diagnostic cases and resume tests',
      category: 'Actions',
      shortcut: 'O',
      icon: '🗂️',
      onSelect: () => {
        onClose();
        if (onOpenRecentCases) onOpenRecentCases();
      },
    },
    {
      id: 'knowledge-base',
      title: 'Failure Mode Knowledge Base',
      subtitle: 'Capacitor, resistor, diode, and rail failure signatures & test guides',
      category: 'Navigation',
      shortcut: 'K',
      icon: '📚',
      onSelect: () => {
        onClose();
        navigate('/knowledge');
      },
    },
    {
      id: 'history',
      title: 'View Saved History',
      subtitle: 'Review permanent saved diagnostic analyses and solutions',
      category: 'Navigation',
      shortcut: 'H',
      icon: '⏱️',
      onSelect: () => {
        onClose();
        navigate('/history');
      },
    },
    {
      id: 'settings',
      title: 'Settings & Privacy Controls',
      subtitle: 'Configure 7-day image retention, AI services, and preferences',
      category: 'Navigation',
      shortcut: 'S',
      icon: '⚙️',
      onSelect: () => {
        onClose();
        navigate('/settings');
      },
    },
    ...(onSimulateDemoCase
      ? [
          {
            id: 'demo-pcb',
            title: 'Load PCB C12 Capacitor Demo Case',
            subtitle: 'Simulate closed-loop diagnostic flow with electrolytic capacitor failure',
            category: 'Diagnostic' as const,
            shortcut: 'D',
            icon: '🔬',
            onSelect: () => {
              onClose();
              onSimulateDemoCase();
            },
          },
        ]
      : []),
  ];

  const filtered = commands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.subtitle.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command search palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-graphite-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-graphite-900 border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-graphite-850">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/40"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, diagnostic actions, navigation... (Esc to close)"
            className="w-full bg-transparent text-white font-mono text-sm placeholder:text-white/30 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-white/40 bg-graphite-800 border border-white/[0.1] px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-white/[0.03]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-white/40 font-mono text-xs">
              No matching diagnostic commands or tools found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => item.onSelect()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-lime-400/10 border border-lime-400/30 text-white'
                      : 'border border-transparent text-white/80 hover:bg-graphite-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs font-semibold truncate ${
                            isSelected ? 'text-lime-400' : 'text-white'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono text-white/30 uppercase px-1.5 py-0.5 bg-white/[0.04] rounded">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  {item.shortcut && (
                    <kbd className="text-[10px] font-mono text-white/40 bg-graphite-800 border border-white/[0.08] px-1.5 py-0.5 rounded flex-shrink-0">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 bg-graphite-950/60 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-white/30">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="text-lime-400/50">Reality → Action AI Command Hub</span>
        </div>
      </div>
    </div>
  );
};
