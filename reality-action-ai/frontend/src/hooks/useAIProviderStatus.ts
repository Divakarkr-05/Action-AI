import { useEffect, useState, useCallback } from 'react';
import { fetchHealth } from '../services/graphql';

export interface AIProviderStatus {
  state: 'connected' | 'offline' | 'unknown' | 'loading';
  provider: string;
  model: string;
  badgeText: string;
  dotClass: string;
  tooltipText: string;
}

export function useAIProviderStatus(): AIProviderStatus & { refresh: () => Promise<void> } {
  const [status, setStatus] = useState<AIProviderStatus>({
    state: 'loading',
    provider: '',
    model: '',
    badgeText: 'AI STATUS UNKNOWN',
    dotClass: 'bg-white/30',
    tooltipText: 'Checking AI provider status...',
  });

  const checkHealth = useCallback(async () => {
    try {
      // 1. Try GraphQL health query
      const res = await fetchHealth();
      const h = res?.health;

      if (h && h.status === 'ok') {
        const rawProvider = (h.provider || h.aiMode || '').trim().toLowerCase();
        const modelName = (h.model || '').trim();
        const upperProvider = rawProvider ? rawProvider.toUpperCase() : 'AI';

        setStatus({
          state: 'connected',
          provider: rawProvider,
          model: modelName,
          badgeText: `${upperProvider} CONNECTED`,
          dotClass: 'bg-lime-400 animate-pulse',
          tooltipText: modelName
            ? `${upperProvider} • ${modelName.toUpperCase()}`
            : `${upperProvider} CONNECTED`,
        });
        return;
      }

      // If status exists but not 'ok'
      if (h && h.provider) {
        const upper = h.provider.trim().toUpperCase();
        setStatus({
          state: 'offline',
          provider: h.provider,
          model: h.model || '',
          badgeText: `${upper} OFFLINE`,
          dotClass: 'bg-yellow-400/80 animate-pulse-slow',
          tooltipText: `${upper} service reported status: ${h.status}`,
        });
        return;
      }
    } catch (gqlErr) {
      // 2. Fallback check directly to REST /health in case GraphQL had an AST error
      try {
        const restRes = await fetch('/health');
        if (restRes.ok) {
          const data = await restRes.json();
          if (data.status === 'ok') {
            const rawProvider = (data.provider || data.ai_mode || '').trim().toLowerCase();
            const modelName = (data.model || '').trim();
            const upperProvider = rawProvider ? rawProvider.toUpperCase() : 'AI';

            setStatus({
              state: 'connected',
              provider: rawProvider,
              model: modelName,
              badgeText: `${upperProvider} CONNECTED`,
              dotClass: 'bg-lime-400 animate-pulse',
              tooltipText: modelName
                ? `${upperProvider} • ${modelName.toUpperCase()}`
                : `${upperProvider} CONNECTED`,
            });
            return;
          }
        }
      } catch (restErr) {
        // Both failed
      }
    }

    // Health endpoint unavailable or errored out
    setStatus({
      state: 'unknown',
      provider: '',
      model: '',
      badgeText: 'AI STATUS UNKNOWN',
      dotClass: 'bg-white/30',
      tooltipText: 'Backend health endpoint unavailable',
    });
  }, []);

  useEffect(() => {
    checkHealth();
    // Poll every 30 seconds to react to backend provider changes
    const timer = setInterval(checkHealth, 30000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  return { ...status, refresh: checkHealth };
}
