import AppointmentSlotFinder from './AppointmentSlotFinder';
import { appointmentSeriesIssue } from '@/lib/appointmentSlots';
import AgendaClientPicker from './AgendaClientPicker';
import { useMemo, useRef, useState } from 'react';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { ArrowUp, ArrowDown, Plus, X, Clock3, CheckCircle2 } from 'lucide-react';
import type { Staff } from '@/hooks/useStaff';
import type { Appointment } from '@/data/appointments';
import type { DaySchedule } from '@/hooks/useOpeningHours';
import type { StaffTimeOff } from '@/lib/staffTimeOff';
import { appointmentDraftSeries, buildAppointmentDraft, type AppointmentService, type Recurrence } from '@/lib/appointmentDraft';
import { appointmentPalette } from '@/lib/appointmentPalette';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppointmentTimeline from './AppointmentTimeline';
import type { AgendaCreateDialogProps } from './AgendaWorkspace';

type Props = AgendaCreateDialogProps & {
  services: AppointmentService[]; staff: Staff[]; appointments: Appointment[]; timeOff: StaffTimeOff[];
  schedule: (date: Date) => DaySchedule | null; unavailable?: boolean; demo?: boolean; timezone?: string;
  onSave: (appointment: Appointment, recurrence: Recurrence | null) => Promise<void>;
};
export default function CreateAppointmentDialog({ clientSuggestions = [], prefill, isOpen, onClose, onCreated, onTimeOffClick, selectedDate, selectedTimeSlot, staffId, services, staff, appointments, timeOff, schedule, unavailable = false, demo = false, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone, onSave }: Props) {
  const [clientName, setClientName] = useState(prefill?.client.name || ''), [phone, setPhone] = useState(prefill?.client.phone || ''), [notes, setNotes] = useState('');
  const [date, setDate] = useState(formatInTimeZone(selectedDate, timezone, 'yyyy-MM-dd'));
  const [time, setTime] = useState(selectedTimeSlot || (demo ? '17:00' : ''));
  const [memberId, setMemberId] = useState(staffId || staff[0]?.id || '');
  const [serviceIds, setServiceIds] = useState<string[]>(() => prefill?.services ? [...new Set(prefill.services.filter(item => services.some(service => service.id === item.id)).map(item => item.id))] : services[0] ? [services[0].id] : []);
  const [nextServiceId, setNextServiceId] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [frequency, setFrequency] = useState<Recurrence['frequency']>('weekly');
  const [interval, setInterval] = useState('1'), [occurrences, setOccurrences] = useState('4');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const saving = useRef(false);
  const [slotsOpen, setSlotsOpen] = useState(false);
  const availability = useMemo(() => ({ staff, appointments, timeOff, schedule, timezone }), [staff, appointments, timeOff, schedule, timezone]);
  const recurrence = useMemo<Recurrence | null>(() => repeat ? { frequency, interval: Number(interval), occurrences: Number(occurrences) } : null, [repeat, frequency, interval, occurrences]);
  const missingServices = prefill?.services?.filter(item => !services.some(service => service.id === item.id)) || [];
  const selected = useMemo(() => serviceIds.map(id => services.find(item => item.id === id)).filter((item): item is AppointmentService => !!item), [serviceIds, services]);
  const draftResult = useMemo(() => {
    if (!date || !time || !serviceIds.length) return { draft: null, series: [], issue: '' };
    try {
      if (selected.length !== serviceIds.length) throw new Error('Une prestation sélectionnée n’est plus disponible.');
      const draft = buildAppointmentDraft({ services: selected, startTime: fromZonedTime(`${date}T${time}:00`, timezone), staffId: memberId });
      const series = appointmentDraftSeries(draft, recurrence, timezone);
      const issue = appointmentSeriesIssue(series, availability);
      return { draft, series, issue };
    } catch (err) { return { draft: null, series: [], issue: err instanceof Error ? err.message : 'Vérifiez les prestations.' }; }
  // The catalogue and availability data must update the draft while the form stays open.
  }, [date, time, memberId, serviceIds, selected, availability, timezone, recurrence]);
  const { draft, series } = draftResult;
  const issue = unavailable ? 'Les disponibilités n’ont pas pu être vérifiées. Attendez le chargement ou actualisez l’agenda.' : draftResult.issue;
  const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
  const move = (index: number, delta: number) => setServiceIds(current => { const next = [...current]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; return next; });
  return <Dialog open={isOpen} onOpenChange={open => { if (!open && !saving.current) onClose(); }}>
    <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-2xl p-4 sm:p-6" onInteractOutside={event => { if (busy) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>Nouveau rendez-vous</DialogTitle><DialogDescription>{demo ? 'Testez librement avec un client fictif. Aucun message ne sera envoyé.' : 'Choisissez les prestations dans l’ordre de réalisation.'}</DialogDescription></DialogHeader>
      <form onSubmit={async event => {
        event.preventDefault(); if (saving.current || !draft || issue) return;
        saving.current = true; setBusy(true); setError('');
        try { await onSave({ ...draft, clientName: clientName.trim(), clientPhone: phone.trim(), notes: notes.trim() }, recurrence); onCreated?.(draft); onClose(); }
        catch (err) { setError(err instanceof Error ? err.message : 'Le rendez-vous n’a pas pu être enregistré. Vérifiez le créneau et réessayez.'); }
        finally { saving.current = false; setBusy(false); }
      }}>
        <fieldset disabled={busy} className="grid min-w-0 gap-5 md:grid-cols-[1.15fr_1fr]">
          <div className="min-w-0 space-y-4">
            <AgendaClientPicker clients={clientSuggestions} onSelect={client => { setClientName(client.name); setPhone(client.phone); }} />
            {prefill && <p className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-900">Coordonnées reprises pour ce rendez-vous.{prefill.services && ' Prestations recalculées au tarif et à la durée actuels ; choisissez la date et l’heure.'}</p>}
            {missingServices.length > 0 && <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Prestations indisponibles à remplacer : {missingServices.map(item => item.name).join(', ')}.</p>}
            <div><Label htmlFor="create-name">{demo ? 'Nom du client fictif' : 'Nom du client'}</Label><Input id="create-name" required maxLength={100} value={clientName} onChange={event => setClientName(event.target.value)} autoComplete="off" /></div>
            <div><Label htmlFor="create-phone">{demo ? 'Téléphone fictif' : 'Téléphone'}</Label><Input id="create-phone" type="tel" maxLength={30} value={phone} onChange={event => setPhone(event.target.value)} /></div>
            <div className="grid grid-cols-2 gap-2"><div><Label htmlFor="create-date">Date</Label><Input id="create-date" type="date" required value={date} onChange={event => setDate(event.target.value)} /></div><div><Label htmlFor="create-time">Heure</Label><Input id="create-time" type="time" required value={time} onChange={event => setTime(event.target.value)} /></div></div>
            <div><Label htmlFor="create-staff">Collaborateur</Label><select id="create-staff" className={selectClass} required value={memberId} onChange={event => setMemberId(event.target.value)}><option value="" disabled>Choisir un collaborateur</option>{staff.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <section aria-label="Prestations sélectionnées" className="space-y-2">
              <p className="text-sm font-semibold">Prestations · ordre de réalisation</p>
              {selected.map((service, index) => {
                const palette = appointmentPalette(service.color || '#64748b');
                return <div key={service.id} className="rounded-xl border p-3" style={{ backgroundColor: palette.background, borderColor: palette.border }}>
                  <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold">{index + 1}. {service.name}</span><span className="shrink-0 text-sm">{service.price.toFixed(2)} €</span></div>
                  <div className="mt-2 flex justify-end gap-1"><Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} aria-label={`Monter ${service.name}`} onClick={() => move(index, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === selected.length - 1} aria-label={`Descendre ${service.name}`} onClick={() => move(index, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Retirer ${service.name}`} onClick={() => setServiceIds(current => current.filter(id => id !== service.id))}><X className="h-3.5 w-3.5" /></Button></div>
                </div>;
              })}
              {!selected.length && <p className="text-xs text-slate-500">Ajoutez au moins une prestation.</p>}
              <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Label htmlFor="create-service">Ajouter une prestation</Label><select id="create-service" className={selectClass} value={nextServiceId} onChange={event => setNextServiceId(event.target.value)}><option value="">Choisir…</option>{services.filter(item => !serviceIds.includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><Button type="button" variant="outline" size="icon" aria-label="Ajouter la prestation" disabled={!nextServiceId || serviceIds.includes(nextServiceId)} onClick={() => { if (nextServiceId && !serviceIds.includes(nextServiceId)) setServiceIds(current => [...current, nextServiceId]); setNextServiceId(''); }}><Plus className="h-4 w-4" /></Button></div>
            </section>
            <div><Label htmlFor="create-notes">Notes internes</Label><Textarea id="create-notes" maxLength={2000} value={notes} onChange={event => setNotes(event.target.value)} rows={2} /></div>
            <div className="rounded-xl border p-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={repeat} onChange={event => setRepeat(event.target.checked)} />Répéter ce rendez-vous</label>{repeat && <div className="mt-3 grid grid-cols-2 gap-2"><div className="col-span-2"><Label htmlFor="create-frequency">Fréquence</Label><select id="create-frequency" className={selectClass} value={frequency} onChange={event => setFrequency(event.target.value as Recurrence['frequency'])}><option value="weekly">Chaque semaine</option><option value="monthly">Chaque mois</option></select></div><div><Label htmlFor="create-interval">Intervalle</Label><Input id="create-interval" type="number" required min={1} max={12} value={interval} onChange={event => setInterval(event.target.value)} /></div><div><Label htmlFor="create-occurrences">Nombre de rendez-vous</Label><Input id="create-occurrences" type="number" required min={2} max={52} value={occurrences} onChange={event => setOccurrences(event.target.value)} /></div></div>}</div>
          </div>
          <div className="min-w-0 space-y-4">
            <section aria-label="Résumé du rendez-vous" className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-950"><Clock3 className="h-4 w-4" />Résumé du rendez-vous</p>
              {draft ? <><p className="mb-2 text-xs font-medium text-indigo-800">{formatInTimeZone(draft.startTime, timezone, 'dd/MM/yyyy')} · {staff.find(member => member.id === memberId)?.name}</p><div className="flex items-end justify-between gap-2"><span className="text-2xl font-bold tabular-nums text-indigo-950">{formatInTimeZone(draft.startTime, timezone, 'HH:mm')} → {formatInTimeZone(draft.endTime, timezone, 'HH:mm')}</span><span className="text-lg font-semibold">{draft.totalPrice.toFixed(2)} €</span></div><p className="mt-2 text-xs text-indigo-800">{(draft.endTime.getTime() - draft.startTime.getTime()) / 60000} min · {selected.length} prestation{selected.length > 1 ? 's' : ''} · préparation comprise</p>{repeat && <p className="mt-2 text-xs">{series.length} rendez-vous · total prévu {(draft.totalPrice * series.length).toFixed(2)} €</p>}</> : <p className="text-sm text-slate-600">Choisissez les prestations et l’heure pour voir la durée et le total.</p>}
              <p className="mt-2 text-[10px] text-slate-500">Horaires : {timezone === 'Europe/Brussels' ? 'Bruxelles' : timezone}</p>
            </section>
            <Button type="button" variant="outline" className="w-full" aria-expanded={slotsOpen} aria-controls="appointment-slot-finder" onClick={() => setSlotsOpen(value => !value)}>{slotsOpen ? 'Masquer les disponibilités' : 'Trouver un créneau'}</Button>
            {slotsOpen && <AppointmentSlotFinder services={selected} date={date} staffId={memberId} recurrence={recurrence} availability={availability} unavailable={unavailable || selected.length !== serviceIds.length} selectedTime={time} onSelect={slot => {
              setDate(formatInTimeZone(slot.startTime, timezone, 'yyyy-MM-dd')); setTime(formatInTimeZone(slot.startTime, timezone, 'HH:mm')); setMemberId(slot.staffId); setError('');
            }} />}
            {issue ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{issue}</p> : draft && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4" />{repeat ? 'Les créneaux de la série sont disponibles' : 'Créneau disponible'} selon l’agenda chargé.</p>}
            {draft && <AppointmentTimeline appointment={draft} timezone={timezone} />}
            {repeat && series.length > 0 && <details className="rounded-xl border p-3 text-xs"><summary className="cursor-pointer font-semibold">Voir les {series.length} dates</summary><ol className="mt-2 max-h-40 space-y-1 overflow-y-auto">{series.map(item => <li key={item.id}>{formatInTimeZone(item.startTime, timezone, 'dd/MM/yyyy · HH:mm')}</li>)}</ol></details>}
            {onTimeOffClick && <Button type="button" variant="outline" className="w-full whitespace-normal" onClick={onTimeOffClick}>Bloquer un créneau sans rendez-vous</Button>}
          </div>
        </fieldset>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Annuler</Button><Button type="submit" disabled={busy || !draft || !!issue || !clientName.trim()}>{busy ? 'Enregistrement…' : repeat ? 'Créer la série' : 'Créer le rendez-vous'}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
