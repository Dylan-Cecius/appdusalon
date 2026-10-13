import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { searchAgendaClients, type AgendaClient } from '@/lib/agendaClients';

export default function AgendaClientPicker({ clients, onSelect }: { clients: AgendaClient[]; onSelect: (client: AgendaClient) => void }) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => query.trim().length >= 2 ? searchAgendaClients(clients, query) : [], [clients, query]);
  return <section className="rounded-xl border border-slate-200 bg-slate-50 p-3" aria-label="Client existant">
    <Label htmlFor="booking-client-search" className="flex items-center gap-2"><Search className="h-3.5 w-3.5" />Retrouver un client</Label>
    <Input id="booking-client-search" className="mt-2 bg-white" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom ou téléphone" autoComplete="off" />
    {query.trim().length >= 2 ? <>
      <p role="status" className="mt-2 text-xs text-slate-500">{matches.length ? `${matches.length} contact${matches.length > 1 ? 's' : ''} trouvé${matches.length > 1 ? 's' : ''}` : 'Aucun contact trouvé. Saisissez ses coordonnées ci-dessous.'}</p>
      <ul className="mt-2 space-y-1">{matches.slice(0, 6).map(client => <li key={client.key}><button type="button" onClick={() => { onSelect(client); setQuery(''); }} className="w-full rounded-lg border bg-white p-2 text-left text-sm hover:border-indigo-300 focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`Choisir ${client.name}, ${client.phone || 'sans téléphone'}`}>
        <span className="block font-medium">{client.name}</span><span className="text-xs text-slate-500">{client.phone || 'Sans téléphone'} · {client.registered ? 'Fiche client' : 'Agenda'}</span>
      </button></li>)}</ul>
      {matches.length > 6 && <p className="mt-2 text-xs text-slate-500">Précisez la recherche pour retrouver les autres contacts.</p>}
    </> : <p className="mt-2 text-xs text-slate-500">Deux caractères suffisent. Vous pouvez aussi saisir un nouveau client ci-dessous.</p>}
  </section>;
}
