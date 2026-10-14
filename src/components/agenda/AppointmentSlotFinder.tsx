import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { CalendarSearch, RefreshCw } from 'lucide-react';
import { findAppointmentSlots, type AppointmentSlot } from '@/lib/appointmentSlots';
import type { AppointmentAvailability } from '@/lib/appointmentMove';
import type { AppointmentService, Recurrence } from '@/lib/appointmentDraft';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AppointmentSlotFinder({ services, date, staffId, recurrence, availability, unavailable, selectedTime, onSelect }: {
  services: AppointmentService[]; date: string; staffId: string; recurrence: Recurrence | null;
  availability: AppointmentAvailability; unavailable: boolean; selectedTime: string;
  onSelect: (slot: AppointmentSlot) => void;
}) {
  const { timezone, staff } = availability;
  const [now, setNow] = useState(() => new Date());
  const today = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState(() => date > today ? date : today);
  const [allStaff, setAllStaff] = useState(false);
  const [limit, setLimit] = useState(12);
  const [notice, setNotice] = useState('');
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60000); return () => window.clearInterval(timer); }, []);
  const result = useMemo(() => {
    if (unavailable) return { slots: [], hasMore: false, error: 'Les disponibilités ne sont pas vérifiées. Attendez le chargement ou actualisez l’agenda.' };
    if (!allStaff && !staff.some(member => member.id === staffId && member.is_active)) return { slots: [], hasMore: false, error: 'Choisissez un collaborateur ou recherchez dans toute l’équipe.' };
    try { return { ...findAppointmentSlots({ services, dateFrom, staffId: allStaff ? undefined : staffId, recurrence, now, limit }, availability), error: '' }; }
    catch (error) { return { slots: [], hasMore: false, error: error instanceof Error ? error.message : 'Vérifiez les prestations et les dates.' }; }
  }, [services, dateFrom, staffId, allStaff, recurrence, now, limit, availability, unavailable, staff]);
  const groups = new Map<string, AppointmentSlot[]>();
  for (const slot of result.slots) {
    const key = formatInTimeZone(slot.startTime, timezone, 'yyyy-MM-dd');
    groups.set(key, [...(groups.get(key) || []), slot]);
  }
  return <section id="appointment-slot-finder" aria-label="Recherche de créneaux" className="space-y-3 rounded-2xl border border-indigo-100 bg-white p-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-950"><CalendarSearch className="h-4 w-4" />Prochaines disponibilités</h3>
    <p className="text-xs text-slate-600">Recherche sur 7 jours, par pas de 15 min, selon l’agenda chargé.{recurrence ? ' Toutes les dates de la série sont vérifiées.' : ' Toutes les prestations et leur préparation sont comprises.'}</p>
    <div><Label htmlFor="slot-date-from">Rechercher à partir du</Label><Input id="slot-date-from" type="date" value={dateFrom} onChange={event => { setDateFrom(event.target.value); setLimit(12); setNotice(''); }} /></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allStaff} onChange={event => { setAllStaff(event.target.checked); setLimit(12); }} />Toute l’équipe</label>
    {!allStaff && <p className="text-xs text-slate-600">Collaborateur : {staff.find(member => member.id === staffId)?.name || 'à choisir dans le formulaire'}</p>}
    {result.error ? <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-950">{result.error}</p> : <>
      <p role="status" className="text-xs text-slate-600">{result.slots.length ? `${result.slots.length} propositions${result.hasMore ? ' affichées' : ''}` : 'Aucun créneau compatible sur ces 7 jours. Essayez une autre date, toute l’équipe ou moins de prestations.'}</p>
      {[...groups].map(([key, slots]) => <div key={key} className="space-y-2">
        <p className="text-xs font-semibold capitalize text-slate-700">{formatInTimeZone(slots[0].startTime, timezone, 'EEEE d MMMM', { locale: fr })}</p>
        <div className="grid grid-cols-2 gap-2">{slots.map(slot => {
          const start = formatInTimeZone(slot.startTime, timezone, 'HH:mm'), end = formatInTimeZone(slot.endTime, timezone, 'HH:mm');
          const selected = key === date && start === selectedTime && slot.staffId === staffId;
          return <button key={`${key}-${start}-${slot.staffId}`} type="button" aria-pressed={selected}
            aria-label={`Choisir le ${formatInTimeZone(slot.startTime, timezone, 'dd/MM/yyyy')} à ${start} avec ${slot.staffName}, fin ${end}`}
            className={`min-w-0 rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${selected ? 'border-indigo-400 bg-indigo-100 text-indigo-950' : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-indigo-300 hover:bg-indigo-50'}`}
            onClick={() => {
              if (slot.startTime.getTime() <= Date.now()) { setNow(new Date()); setNotice('Ce créneau est passé. Les propositions ont été actualisées.'); return; }
              onSelect(slot); setNotice('');
            }}>
            <span className="block text-sm font-semibold tabular-nums">{start} → {end}</span><span className="mt-1 block truncate text-xs">{slot.staffName}</span>
          </button>;
        })}</div>
      </div>)}
      {result.hasMore && limit < 48 && <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setLimit(value => value + 12)}>Voir plus de créneaux</Button>}
      {result.hasMore && limit >= 48 && <p className="text-xs text-slate-500">48 propositions affichées. Avancez la date de départ pour explorer les jours suivants.</p>}
    </>}
    {notice && <p aria-live="polite" className="rounded-lg bg-indigo-50 p-2 text-xs text-indigo-950">{notice}</p>}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => { setNow(new Date()); setNotice('Propositions actualisées.'); }}><RefreshCw className="mr-1 h-3.5 w-3.5" />Actualiser</Button>
      <Button type="button" variant="outline" size="sm" disabled={!dateFrom || !!result.error} onClick={() => { setDateFrom(format(addDays(new Date(`${dateFrom}T12:00:00`), 7), 'yyyy-MM-dd')); setLimit(12); setNotice(''); }}>7 jours suivants</Button></div>
    <p className="text-[10px] text-slate-500">Le choix d’un créneau ne le réserve pas. La disponibilité est contrôlée à l’enregistrement.</p>
  </section>;
}
