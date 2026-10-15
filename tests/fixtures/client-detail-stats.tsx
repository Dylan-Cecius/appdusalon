import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useClientDetailStats } from '../../src/hooks/useClientDetailStats';
import type { ClientStats } from '../../src/hooks/useClients';
const requests: { id: string; resolve: (stats: ClientStats) => void; reject: (error: Error) => void }[] = [];
const read = (id: string) => new Promise<ClientStats>((resolve, reject) => requests.push({ id, resolve, reject }));
const controls = {
  count: () => requests.length,
  finish: (index: number, visits: number) => requests[index].resolve({ totalSpent: 0, visitCount: visits, lastVisit: null }),
  fail: (index: number) => requests[index].reject(new Error('Synthetic read failure')),
};
Object.assign(window, { clientStatsFixture: controls });
function Fixture() {
  const [id, setId] = useState<string | null>('A');
  const [draft, setDraft] = useState('Brouillon');
  const { stats, error, loading, retry } = useClientDetailStats(id, read);
  return <main>
    <button onClick={() => setId('A')}>Client A</button><button onClick={() => setId('B')}>Client B</button><button onClick={() => setId(null)}>Fermer</button>
    <label>Saisie indépendante<input value={draft} onChange={event => setDraft(event.target.value)} /></label>
    {loading && <p role="status">Chargement</p>}
    {error && <p role="alert">{error}</p>}
    <output aria-label="Visites">{stats?.visitCount ?? '—'}</output><button onClick={retry}>Réessayer</button>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
