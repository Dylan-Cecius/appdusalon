import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpRight, Search, X } from 'lucide-react';
import type { Appointment } from '@/data/appointments';
import { agendaSearchFilters, searchAppointments, type AgendaSearchFilter } from '@/lib/agendaSearch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AppointmentStatusBadge from './AppointmentStatusBadge';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointments: Appointment[];
  members: { id: string; name: string }[];
  loading: boolean;
  onSelect: (appointment: Appointment) => void;
};

export default function AgendaSearchDialog({ open, onOpenChange, appointments, members, loading, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AgendaSearchFilter>('all');
  const [limit, setLimit] = useState(30);
  const matches = useMemo(() => open ? searchAppointments(appointments, query, filter, new Date()) : [], [open, appointments, query, filter]);
  const memberNames = useMemo(() => new Map(members.map(member => [member.id, member.name])), [members]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="px-5 pb-4 pt-5 text-left">
          <DialogTitle>Rechercher un rendez-vous</DialogTitle>
          <DialogDescription>Toutes les dates et tous les collaborateurs du salon.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 border-b px-5 pb-4">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              aria-label="Client, téléphone ou prestation"
              placeholder="Client, téléphone ou prestation…"
              value={query}
              onChange={event => { setQuery(event.target.value); setLimit(30); }}
              className="h-10 rounded-xl pl-9 pr-10"
            />
            {query && <button type="button" aria-label="Effacer la recherche" onClick={() => { setQuery(''); setLimit(30); }} className="absolute right-1 top-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
          </div>
          <div role="group" aria-label="Filtrer les rendez-vous" className="flex flex-wrap gap-1.5">
            {agendaSearchFilters.map(option => (
              <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => { setFilter(option.value); setLimit(30); }} className={cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', filter === option.value ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <p role="status" className="px-5 py-3 text-xs text-slate-500">{loading ? 'Chargement des rendez-vous…' : `${matches.length} résultat${matches.length > 1 ? 's' : ''}`}</p>
        <div className="min-h-0 overflow-y-auto px-3 pb-3">
          {!loading && matches.length === 0 && (
            <div className="rounded-xl bg-slate-50 px-4 py-10 text-center">
              <Search className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-semibold">Aucun rendez-vous trouvé</p>
              <p className="mt-1 text-xs text-slate-500">Essayez un autre nom ou un autre filtre.</p>
            </div>
          )}
          {!loading && matches.slice(0, limit).map(appointment => (
            <button key={appointment.id} type="button" onClick={() => { onOpenChange(false); onSelect(appointment); }} className="group mb-2 flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-primary/30 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="w-16 shrink-0 rounded-lg bg-slate-50 p-2 text-center">
                <span className="block text-[10px] font-semibold uppercase text-slate-500">{format(new Date(appointment.startTime), 'd MMM', { locale: fr })}</span>
                <span className="block text-sm font-bold tabular-nums">{format(new Date(appointment.startTime), 'HH:mm')}</span>
                <span className="block text-[10px] text-slate-400">{format(new Date(appointment.startTime), 'yyyy')}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{appointment.clientName}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{appointment.services?.map(service => service.name).join(' · ') || 'Rendez-vous'}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{memberNames.get(appointment.staffId || appointment.barberId || '') || 'Collaborateur non actif'}</span>
                <span className="mt-2 flex flex-wrap items-center gap-2">
                  <AppointmentStatusBadge appointment={appointment} />
                  <span className="text-xs font-semibold tabular-nums">{Number(appointment.totalPrice || 0).toFixed(2)} €</span>
                </span>
              </span>
              <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary" />
            </button>
          ))}
          {!loading && matches.length > limit && <button type="button" onClick={() => setLimit(previous => previous + 30)} className="w-full rounded-xl py-3 text-sm font-semibold text-primary hover:bg-primary/5">Afficher plus de résultats</button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
