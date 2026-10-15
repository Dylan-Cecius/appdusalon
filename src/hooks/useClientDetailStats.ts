import type { ClientStats } from './useClients';
import { useClientRead } from './useClientRead';
export function useClientDetailStats(clientId: string | null, read: (id: string) => Promise<ClientStats>) {
  const { data, ...state } = useClientRead(clientId, read, 'Impossible de charger les statistiques de cette fiche.');
  return { ...state, stats: data };
}
