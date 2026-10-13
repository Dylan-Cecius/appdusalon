import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarPlus, Phone, UserRound } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Appointment } from '@/data/appointments';
import { agendaPhone, clientAgendaSummary, clientAppointmentHistory, searchAgendaClients, type AgendaClient } from '@/lib/agendaClients';
import { appointmentPalette } from '@/lib/appointmentPalette';
import AppointmentStatusBadge from './AppointmentStatusBadge';

type Props = {
  clients: AgendaClient[]; appointments: Appointment[]; initialClient?: AgendaClient | null;
  loading?: boolean; error?: boolean; onClose: () => void;
  onBook: (client: AgendaClient, appointment?: Appointment) => void; onAppointment: (appointment: Appointment) => void;
  staff: { id: string; name: string }[]; services: { id: string; color?: string }[]; timezone?: string;
};
export default function AgendaClientPanel({ clients, appointments, initialClient, loading, error, onClose, onBook, onAppointment, staff, services, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone }: Props) {
  const [client, setClient] = useState<AgendaClient | null>(initialClient || null);
  const [query, setQuery] = useState(''), [limit, setLimit] = useState(30);
  const matches = useMemo(() => searchAgendaClients(clients, query), [clients, query]);
  const history = useMemo(() => client ? clientAppointmentHistory(client, appointments) : [], [client, appointments]);
  const summary = clientAgendaSummary(history, new Date());
  const dates = (appointment: Appointment) => formatInTimeZone(appointment.startTime, timezone, 'dd/MM/yyyy · HH:mm');
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-2xl p-4 sm:p-6">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />{client ? client.name : 'Clients de l’agenda'}</DialogTitle><DialogDescription>Coordonnées et rendez-vous de l’agenda chargé.</DialogDescription></DialogHeader>
      {loading && <p role="status" className="text-sm text-slate-500">Chargement des contacts…</p>}
      {error && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Certaines données n’ont pas pu être chargées. L’historique peut être incomplet ; actualisez l’agenda.</p>}
      {client ? <>
        <Button type="button" variant="ghost" className="w-fit" onClick={() => { setClient(null); setLimit(30); }}><ArrowLeft className="mr-2 h-4 w-4" />Tous les contacts</Button>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="flex items-center gap-2 text-sm text-indigo-950"><Phone className="h-4 w-4" />{client.phone || 'Téléphone non renseigné'}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Terminés', summary.completed], ['À venir', summary.upcoming.length], ['Annulés', summary.cancelled], ['Absences', summary.noShows]].map(([label, value]) => <div key={label}><dt className="text-xs text-indigo-800">{label}</dt><dd className="mt-1 text-xl font-semibold text-indigo-950">{value}</dd></div>)}</dl>
          <Button type="button" className="mt-4" onClick={() => onBook(client)}><CalendarPlus className="mr-2 h-4 w-4" />Nouveau RDV pour ce client</Button>
        </div>
        <p className="text-xs text-slate-500">{agendaPhone(client.phone) ? 'Association par nom et numéro identiques, après normalisation. Les noms seuls ne sont jamais regroupés.' : 'Sans numéro exploitable, aucun autre rendez-vous n’est associé automatiquement.'}</p>
        {summary.upcoming[0] && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Prochain rendez-vous : {dates(summary.upcoming[0])}</p>}
        <section aria-label="Historique du client" className="space-y-3">
          <h3 className="text-sm font-semibold">Historique des rendez-vous · {history.length}</h3>
          {!history.length && <p className="text-sm text-slate-500">Aucun rendez-vous associé dans l’agenda chargé.</p>}
          {history.slice(0, limit).map(appointment => <article key={appointment.id} aria-label={`Rendez-vous du ${dates(appointment)}`} className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{dates(appointment)}</p><AppointmentStatusBadge appointment={appointment} /></div>
            <p className="mt-1 text-xs text-slate-500">{staff.find(member => member.id === (appointment.staffId || appointment.barberId))?.name || 'Ancien collaborateur'} · {appointment.totalPrice.toFixed(2)} € prévus</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{appointment.services.map((service, index) => { const palette = appointmentPalette(services.find(item => item.id === service.id)?.color || '#64748b'); return <span key={`${service.id}-${index}`} className="rounded-lg border px-2 py-1 text-xs text-slate-800" style={{ backgroundColor: palette.background, borderColor: palette.border }}>{service.name}</span>; })}</div>
            <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => onAppointment(appointment)}>Ouvrir le rendez-vous</Button><Button type="button" variant="ghost" size="sm" onClick={() => onBook(client, appointment)}>Reprendre ces prestations</Button></div>
          </article>)}
          {history.length > limit && <Button type="button" variant="outline" onClick={() => setLimit(value => value + 30)}>Voir plus de rendez-vous</Button>}
        </section>
      </> : <>
        <div><Label htmlFor="agenda-client-query">Nom ou téléphone du client</Label><Input id="agenda-client-query" className="mt-1" value={query} onChange={event => { setQuery(event.target.value); setLimit(30); }} autoComplete="off" placeholder="Rechercher un contact…" /></div>
        <p role="status" className="text-xs text-slate-500">{matches.length} contact{matches.length > 1 ? 's' : ''}</p>
        {!matches.length && !loading && <p className="text-sm text-slate-500">Aucun contact trouvé.</p>}
        <ul className="space-y-2">{matches.slice(0, limit).map(item => <li key={item.key}><button type="button" onClick={() => { setClient(item); setLimit(30); }} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500" aria-label={`Historique de ${item.name}, ${item.phone || 'sans téléphone'}`}><span className="block text-sm font-semibold">{item.name}</span><span className="text-xs text-slate-500">{item.phone || 'Sans téléphone'} · {item.registered ? 'Fiche client' : 'Contact de l’agenda'}</span></button></li>)}</ul>
        {matches.length > limit && <Button type="button" variant="outline" onClick={() => setLimit(value => value + 30)}>Voir plus de contacts</Button>}
      </>}
    </DialogContent>
  </Dialog>;
}
