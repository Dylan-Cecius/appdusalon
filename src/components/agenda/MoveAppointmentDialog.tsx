import { useMemo, useRef, useState } from 'react';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { ArrowRight, CalendarClock } from 'lucide-react';
import type { Appointment } from '@/data/appointments';
import { appointmentMoveIssue, findAppointmentMoveSlots, moveAppointmentDraft, type AppointmentAvailability } from '@/lib/appointmentMove';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppointmentTimeline from './AppointmentTimeline';

export default function MoveAppointmentDialog({ appointment, availability, unavailable, onClose, onSave }: {
  appointment: Appointment; availability: AppointmentAvailability; unavailable: boolean;
  onClose: () => void; onSave: (candidate: Appointment) => Promise<void>;
}) {
  const { timezone, staff } = availability;
  const [date, setDate] = useState(formatInTimeZone(appointment.startTime, timezone, 'yyyy-MM-dd'));
  const [time, setTime] = useState(formatInTimeZone(appointment.startTime, timezone, 'HH:mm'));
  const [staffId, setStaffId] = useState(appointment.staffId || appointment.barberId || '');
  const [showSlots, setShowSlots] = useState(false), [limit, setLimit] = useState(12);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const saving = useRef(false);
  const draft = useMemo(() => {
    try { return moveAppointmentDraft(appointment, fromZonedTime(`${date}T${time}:00`, timezone), staffId); }
    catch { return null; }
  }, [appointment, date, time, timezone, staffId]);
  const issue = unavailable ? 'Les disponibilités ne sont pas vérifiées. Attendez le chargement ou actualisez l’agenda.' : draft ? appointmentMoveIssue(appointment, draft, availability) : 'Choisissez une date, une heure et un collaborateur.';
  const changed = draft && (draft.startTime.getTime() !== appointment.startTime.getTime() || staffId !== (appointment.staffId || appointment.barberId));
  const slots = useMemo(() => showSlots && !unavailable && date && staffId ? findAppointmentMoveSlots(appointment, date, staffId, availability) : [], [showSlots, unavailable, appointment, date, staffId, availability]);
  const label = (item: Appointment) => `${formatInTimeZone(item.startTime, timezone, 'dd/MM/yyyy · HH:mm')} → ${formatInTimeZone(item.endTime, timezone, 'HH:mm')}`;
  const memberName = (id?: string) => staff.find(member => member.id === id)?.name || 'Ancien collaborateur';
  return <Dialog open onOpenChange={open => { if (!open && !saving.current) onClose(); }}>
    <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto rounded-2xl p-4 sm:p-6" onInteractOutside={event => { if (saving.current) event.preventDefault(); }}>
      <DialogHeader><DialogTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Déplacer le rendez-vous</DialogTitle><DialogDescription>{appointment.clientName} · {appointment.services.map(service => service.name).join(', ')}</DialogDescription></DialogHeader>
      <form onSubmit={async event => {
        event.preventDefault(); if (!draft || issue || !changed || saving.current) return;
        saving.current = true; setBusy(true); setError('');
        try { await onSave(draft); }
        catch (err) { setError(err instanceof Error ? err.message : 'Le déplacement a échoué. Le créneau a peut-être été pris ; actualisez l’agenda.'); }
        finally { saving.current = false; setBusy(false); }
      }}>
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <div className="rounded-xl border bg-slate-50 p-3 text-sm"><p className="text-xs font-medium text-slate-500">Rendez-vous actuel</p><p className="mt-1 font-semibold">{label(appointment)}</p><p className="text-slate-600">{memberName(appointment.staffId || appointment.barberId)}</p></div>
          <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="move-date">Nouvelle date</Label><Input id="move-date" type="date" required value={date} onChange={event => { setDate(event.target.value); setLimit(12); }} /></div><div><Label htmlFor="move-time">Nouvelle heure</Label><Input id="move-time" type="time" required value={time} onChange={event => setTime(event.target.value)} /></div></div>
          <div><Label htmlFor="move-staff">Nouveau collaborateur</Label><select id="move-staff" className="h-10 w-full rounded-md border bg-background px-3 text-sm" required value={staffId} onChange={event => { setStaffId(event.target.value); setLimit(12); }}><option value="" disabled>Choisir un collaborateur</option>{!staff.some(member => member.id === staffId) && staffId && <option value={staffId} disabled>Ancien collaborateur</option>}{staff.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
          <Button type="button" variant="outline" disabled={unavailable || !date || !staffId} onClick={() => setShowSlots(value => !value)}>{showSlots ? 'Masquer les créneaux' : 'Voir les créneaux libres'}</Button>
          {showSlots && <section aria-label="Créneaux de déplacement" className="rounded-xl border p-3"><p className="mb-2 text-xs text-slate-500">Créneaux de 15 min pour la date et le collaborateur choisis, selon l’agenda chargé.</p>{slots.length ? <><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.slice(0, limit).map(slot => <Button key={slot.startTime.toISOString()} type="button" variant={draft?.startTime.getTime() === slot.startTime.getTime() ? 'default' : 'outline'} size="sm" aria-pressed={draft?.startTime.getTime() === slot.startTime.getTime()} onClick={() => setTime(formatInTimeZone(slot.startTime, timezone, 'HH:mm'))}>{formatInTimeZone(slot.startTime, timezone, 'HH:mm')}</Button>)}</div>{slots.length > limit && <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setLimit(value => value + 12)}>Voir plus de créneaux</Button>}</> : <p className="text-sm">Aucun créneau disponible ce jour-là. Essayez une autre date ou un autre collaborateur.</p>}</section>}
          {draft && <section aria-label="Nouveau créneau" className="rounded-xl border border-indigo-100 bg-indigo-50 p-4"><p className="flex items-center gap-2 text-xs font-medium text-indigo-800"><ArrowRight className="h-4 w-4" />Nouveau créneau</p><p className="mt-1 text-lg font-semibold text-indigo-950">{label(draft)}</p><p className="text-sm text-indigo-800">{memberName(staffId)} · {(draft.endTime.getTime() - draft.startTime.getTime()) / 60000} min</p><p className="mt-2 text-xs text-slate-600">Prix réservé : {appointment.totalPrice.toFixed(2)} € · prestations et paiements conservés.</p></section>}
          {appointment.recurrenceGroupId && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-950">Seul ce rendez-vous sera déplacé. Les autres dates de la série restent inchangées.</p>}
          {issue ? <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">{issue}</p> : <p role="status" className="text-xs text-emerald-800">Créneau disponible selon l’agenda chargé.</p>}
          {draft && <AppointmentTimeline appointment={draft} timezone={timezone} />}
          <p className="text-[10px] text-slate-500">Horaires : {timezone === 'Europe/Brussels' ? 'Bruxelles' : timezone}</p>
        </fieldset>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <div className="mt-5 flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Retour</Button><Button type="submit" disabled={busy || !!issue || !changed}>{busy ? 'Déplacement…' : 'Confirmer le déplacement'}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
