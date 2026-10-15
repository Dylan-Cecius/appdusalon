import { useCallback, useEffect, useState } from 'react';
import type { ClientStats } from './useClients';

/** Each effect owns its result; closing/replacing the client invalidates it. */
export function useClientDetailStats(clientId: string | null, read: (id: string) => Promise<ClientStats>) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ id: string; data: ClientStats | null; error: string | null; loading: boolean } | null>(null);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!clientId) return;
    let current = true;
    setState({ id: clientId, data: null, error: null, loading: true });
    void Promise.resolve().then(() => current ? read(clientId) : null).then(data => {
      if (current) setState({ id: clientId, data, error: null, loading: false });
    }).catch(() => {
      if (current) setState({ id: clientId, data: null, error: 'Impossible de charger les statistiques de cette fiche.', loading: false });
    });
    return () => { current = false; };
  }, [clientId, read, revision]);
  const visible = clientId && state?.id === clientId ? state : null;
  return { stats: visible?.data ?? null, error: visible?.error ?? null, loading: !!clientId && (!visible || visible.loading), retry };
}
