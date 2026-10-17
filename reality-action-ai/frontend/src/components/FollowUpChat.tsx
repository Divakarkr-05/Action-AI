/**
 * FollowUpChat – Follow-up Q&A interface below the analysis results.
 */

import { useCallback, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { askFollowUp } from '../services/graphql';
import type { ChatMessage } from '../types';

interface FollowUpChatProps {
  sessionId: string;
}

const EXAMPLE_QUESTIONS = [
  'What happens if I skip a step?',
  'Is this connection safe to touch?',
  'What should I inspect next?',
  'Do I need any tools?',
];

export function FollowUpChat({ sessionId }: FollowUpChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);
      setError(null);

      try {
        const result = await askFollowUp(sessionId, text.trim());

        const assistantMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: result.answer,
          timestamp: new Date(),
          result,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to get a response. Please try again.',
        );
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
    },
    [isLoading, sessionId, scrollToBottom],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <section className="mt-8 border-t border-white/[0.06] pt-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <h2 className="font-mono text-xs text-white/40 uppercase tracking-[0.2em] whitespace-nowrap">
          ASK REALITY → ACTION
        </h2>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* Example questions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-6 animate-fade-in">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={isLoading}
              className="text-xs font-mono text-white/40 border border-white/[0.08]
                         rounded-lg px-3 py-2 hover:border-lime-400/25 hover:text-lime-400/70
                         hover:bg-lime-400/[0.04] transition-all duration-200
                         disabled:opacity-30 disabled:cursor-not-allowed"
            >
              "{q}"
            </button>
          ))}
        </div>
      )}

      {/* Message list */}
      {messages.length > 0 && (
        <div className="flex flex-col gap-4 mb-6 max-h-80 overflow-y-auto no-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              {msg.role === 'user' ? (
                <div className="max-w-[75%] bg-graphite-700 border border-white/[0.07]
                                rounded-xl rounded-tr-sm px-4 py-3">
                  <p className="text-white/80 text-sm font-light">{msg.content}</p>
                </div>
              ) : (
                <div className="max-w-[85%] flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-lime-400/60" />
                    <span className="label-tech text-lime-400/50">Gemma 4</span>
                  </div>
                  <div className="bg-graphite-800 border border-lime-400/10 rounded-xl rounded-tl-sm px-4 py-3">
                    <p className="text-white/70 text-sm leading-relaxed font-light">{msg.content}</p>

                    {/* Inline step list if present */}
                    {msg.result?.steps && msg.result.steps.length > 0 && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        {msg.result.steps.map((step, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="font-mono text-lime-400/50 flex-shrink-0">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="text-white/50">{step}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Confidence badge */}
                    {msg.result && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="h-0.5 bg-white/[0.06] rounded-full flex-1">
                          <div
                            className="h-full bg-lime-400/40 rounded-full"
                            style={{ width: `${Math.round(msg.result.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="label-tech text-white/20">
                          {Math.round(msg.result.confidence * 100)}%
                        </span>
                      </div>
                    )}
                    {msg.result?.groundingSources && msg.result.groundingSources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-lime-400/90 font-medium">
                          Grounding:
                        </span>
                        {msg.result.groundingSources.map((src, i) => (
                          <span
                            key={i}
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white/60"
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading bubble */}
          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="flex items-center gap-2 bg-graphite-800 border border-lime-400/10
                              rounded-xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-lime-400/50 animate-bounce"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-500/[0.08] border border-red-500/20">
          <span className="text-red-400 text-xs font-mono">{error}</span>
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id="follow-up-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What should I check first?"
          disabled={isLoading}
          className="flex-1 bg-graphite-800 border border-white/[0.08] rounded-xl px-4 py-3
                     text-white/80 text-sm placeholder:text-white/20 font-mono
                     focus:outline-none focus:border-lime-400/30
                     disabled:opacity-50 transition-all duration-200"
        />
        <button
          id="follow-up-send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          className="btn-primary px-5 py-3 flex-shrink-0"
          aria-label="Send follow-up question"
        >
          {isLoading ? (
            <span className="w-3 h-3 border border-graphite-950/40 border-t-graphite-950 rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M12 7H2M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}
