import { useCallback, useEffect, useRef, useState } from 'react';
import { createLatestRequestScope } from '@/lib/latestRequestScope';
import type { LoyaltySnapshot } from '@/lib/loyaltyRead';

export function useLoyaltySnapshot(contextKey: string | null, read: (current: () => boolean) => Promise<LoyaltySnapshot | null>) {
  const scope = useRef(createLatestRequestScope());
  scope.current.setContext(contextKey);
  const [state, setState] = useState<{ context: string; data: LoyaltySnapshot | null; loading: boolean; error: string | null } | null>(null);
  const refresh = useCallback(async () => {
    const current = scope.current.begin(contextKey);
    if (!current || !contextKey) return;
    setState(previous => ({ context: contextKey, data: previous?.context === contextKey ? previous.data : null, loading: true, error: null }));
    try {
      const data = await read(current);
      if (current() && data) setState({ context: contextKey, data, loading: false, error: null });
    } catch {
      if (current()) setState(previous => ({ context: contextKey, data: previous?.context === contextKey ? previous.data : null, loading: false, error: 'Impossible de charger la fidélité. Réessayez pour connaître son état.' }));
    }
  }, [contextKey, read]);
  useEffect(() => {
    const requestScope = scope.current;
    void refresh();
    return () => requestScope.invalidate();
  }, [refresh]);
  const visible = contextKey && state?.context === contextKey ? state : null;
  return { data: visible?.data ?? null, error: visible?.error ?? null, loading: !!contextKey && (!visible || visible.loading), refresh, captureContext: () => scope.current.captureContext(contextKey) };
}
