import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useLoyaltySnapshot } from '../../src/hooks/useLoyaltySnapshot';
import { LoyaltyProgramForm } from '../../src/components/LoyaltyProgramForm';
import { defaultLoyaltyProgram, type LoyaltySnapshot, type LoyaltyProgram } from '../../src/lib/loyaltyRead';
import type { LoyaltyFields } from '../../src/lib/loyaltyPersistence';
import '../../src/index.css';
const initial = { ...defaultLoyaltyProgram('A'), enabled: true, updated_at: '2026-10-15T10:00:00.000Z' };
const requests: { resolve: (value: LoyaltySnapshot) => void; reject: (error: Error) => void }[] = [];
const saves: { fields: LoyaltyFields; revision: string | null; resolve: (value: LoyaltyProgram) => void; reject: (error: Error) => void }[] = [];
const read = () => new Promise<LoyaltySnapshot>( (resolve, reject) => requests.push({ resolve, reject }));
const save = (fields: LoyaltyFields, revision: string | null) => new Promise<LoyaltyProgram>((resolve, reject) => saves.push({ fields, revision, resolve, reject }));
const controls = {
  readCount: () => requests.length,
  saveCount: () => saves.length,
  revision: (i: number) => saves[i].revision,
  finishRead: (i: number, value: number) => requests[i].resolve({ program: { ...initial, points_per_euro: value }, account: null, events: [] }),
  failRead: (i: number) => requests[i].reject(new Error('Synthetic failure')),
  finishSave: (i: number) => saves[i].resolve({ ...initial, ...saves[i].fields, updated_at: '2026-10-15T12:00:00.000Z' }),
  failSave: (i: number) => saves[i].reject(new Error('Synthetic failure')),
};
Object.assign(window, { loyaltyFixture: controls });
function Reads() {
  const [context, setContext] = useState<string | null>('A');
  const { data, loading, error, refresh } = useLoyaltySnapshot(context, read);
  return <main><button onClick={() => setContext('B')}>Salon B</button><button onClick={() => setContext(null)}>Fermer</button><button onClick={() => void refresh()}>Actualiser</button>
    {loading && <p role="status">Chargement</p>}{error && <p role="alert">{error}</p>}
    <output aria-label="Points par euro lus">{loading || error ? '—' : data?.program.points_per_euro ?? '—'}</output>
  </main>;
}
function Form() {
  const [context, setContext] = useState('A');
  const [program, setProgram] = useState(initial);
  const [disabled, setDisabled] = useState(false);
  return <main className="mx-auto max-w-3xl p-3">
    <button onClick={() => setContext('B')}>Salon B</button>
    <button onClick={() => setDisabled(value => !value)}>Basculer accès</button>
    <LoyaltyProgramForm key={context} program={program} disabled={disabled} saveProgram={save} onRefresh={() => setProgram({ ...initial, points_per_euro: 4, updated_at: '2026-10-15T11:00:00.000Z' })} />
  </main>;
}
createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).get('mode') === 'form' ? <Form /> : <Reads />);
