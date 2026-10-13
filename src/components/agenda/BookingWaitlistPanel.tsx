import type { StaffTimeOff } from '@/lib/staffTimeOff';
import { format } from 'date-fns';
import { useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';
import { BellRing, Clock3, Phone, Scissors, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';
import type { Appointment } from '@/data/appointments';
import type { Staff } from '@/hooks/useStaff';
import type { DaySchedule } from '@/hooks/useOpeningHours';
import { findWaitlistSlots, type WaitlistRequest, type WaitlistService, type WaitlistSlot } from '@/lib/waitlistSlots';
import WaitlistRequestForm from './WaitlistRequestForm';
import { Input } from '@/components/ui/input';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: BookingWaitlistEntry[];
  loading: boolean;
  timeOff?: StaffTimeOff[];
  availabilityError?: boolean;
  onCancel: (id: string) => Promise<void>;
  services?: WaitlistService[];
  staff?: Staff[];
  appointments?: Appointment[];
  schedule?: (date: Date) => DaySchedule | null;
  timezone?: string;
  onAdd?: (entry: WaitlistRequest) => Promise<void>;
  onBook?: (entry: BookingWaitlistEntry, slot: WaitlistSlot) => Promise<void>;
};

const BookingWaitlistPanel = ({
  open,
  onOpenChange,
  entries,
  loading, timeOff = [], availabilityError = false,
  onCancel,
  services = [], staff = [], appointments = [], schedule = () => null,
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  onAdd, onBook,
}: Props) => {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<WaitlistSlot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const filtered = entries.filter(entry => normalize(`${entry.client_name} ${entry.client_phone} ${entry.service?.name || ''}`).includes(normalize(query)));
  const selectedEntry = entries.find(entry => entry.id === selectedId);
  const slots = selectedEntry && !availabilityError ? findWaitlistSlots(selectedEntry, { services, staff, appointments, schedule, timezone, timeOff }) : [];
  const act = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Action impossible. Réessayez.'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92vw] p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Liste d’attente
          </SheetTitle>
        </SheetHeader>

        <div className="h-[calc(100vh-72px)] overflow-y-auto bg-slate-50 p-3">
          <div className="mb-3 space-y-2">
            {onAdd && <Button className="w-full" disabled={busy || !services.length} onClick={() => setAdding(value => !value)}>Ajouter une demande</Button>}
            {adding && onAdd && <WaitlistRequestForm services={services} staff={staff} timezone={timezone} onCancel={() => setAdding(false)} onSave={async entry => { await onAdd(entry); setAdding(false); setQuery(''); }} />}
            <Input aria-label="Rechercher dans la liste d’attente" placeholder="Nom, téléphone ou prestation…" value={query} onChange={event => setQuery(event.target.value)} />
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          </div>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-2xl border bg-white" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-white p-6 text-center">
              <BellRing className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-900">Aucune demande en attente</p>
              <p className="mt-1 text-xs text-slate-500">
                Ajoutez une demande ou retrouvez ici les clients inscrits depuis la réservation en ligne.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.length === 0 && <p className="p-4 text-sm text-slate-500">Aucune demande ne correspond à la recherche.</p>}
              {filtered.map((entry) => {
                const fromDate = new Date(entry.preferred_date_from + 'T12:00:00');
                const toDate = new Date(entry.preferred_date_to + 'T12:00:00');
                const sameDate = entry.preferred_date_from === entry.preferred_date_to;

                return (
                  <article key={entry.id} aria-label={`Demande de ${entry.client_name}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-950">{entry.client_name}</p>
                          <span
                            className={
                              entry.status === 'notified'
                                ? 'rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700'
                                : 'rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700'
                            }
                          >
                            {entry.status === 'notified' ? 'SMS ENVOYÉ' : 'ACTIVE'}
                          </span>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="h-3 w-3" />
                          {entry.client_phone}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:text-destructive"
                        disabled={busy}
                        onClick={() => void act(() => onCancel(entry.id))}
                        aria-label={`Retirer la demande de ${entry.client_name}`}
                        title="Retirer de la liste"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {onBook && <div className="mt-3">
                      <Button variant="outline" className="w-full" disabled={busy || loading} onClick={() => { setSelectedId(selectedId === entry.id ? null : entry.id); setSelectedSlot(null); setError(''); }}>Trouver un créneau</Button>
                      {selectedId === entry.id && <div className="mt-3 space-y-2">
                        <p className="text-xs text-slate-500">Propositions selon les préférences du client. Confirmez son accord avant de créer le rendez-vous.</p>
                        {timezone === 'Europe/Brussels' && <p className="text-[10px] text-slate-500">Heure du salon · Bruxelles</p>}
                        {availabilityError && <p role="alert" className="text-xs text-red-700">Les indisponibilités n’ont pas pu être vérifiées. Réessayez après actualisation.</p>}
                        {slots.length === 0 ? <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Aucun créneau adapté sur cette période. Vérifiez les horaires du salon et du collaborateur.</p> : <fieldset className="space-y-1.5"><legend className="mb-1 text-xs font-semibold">Choisir un créneau</legend>
                          {slots.map(slot => <label key={`${slot.staffId}-${slot.startTime.toISOString()}`} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50">
                            <input type="radio" name={`slot-${entry.id}`} disabled={busy} checked={selectedSlot?.staffId === slot.staffId && selectedSlot?.startTime.getTime() === slot.startTime.getTime()} onChange={() => setSelectedSlot(slot)} />
                            <span><span className="block font-semibold">{formatInTimeZone(slot.startTime, timezone, 'EEE d MMM · HH:mm', { locale: fr })}–{formatInTimeZone(slot.endTime, timezone, 'HH:mm')}</span><span>{slot.staffName}</span></span>
                          </label>)}
                        </fieldset>}
                        <Button className="w-full" disabled={busy || !selectedSlot || !slots.some(slot => slot.staffId === selectedSlot.staffId && slot.startTime.getTime() === selectedSlot.startTime.getTime())} onClick={() => selectedSlot && void act(async () => { await onBook(entry, selectedSlot); setSelectedId(null); setSelectedSlot(null); })}>{busy ? 'Création…' : 'Créer le rendez-vous'}</Button>
                      </div>}
                    </div>}

                    <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-slate-700">
                          {entry.service?.name || 'Prestation'}
                        </span>
                      </div>
                      {entry.preferred_staff?.name && (
                        <div className="flex items-center gap-2">
                          <UserRound className="h-3.5 w-3.5 text-slate-400" />
                          <span>{entry.preferred_staff.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {sameDate
                            ? format(fromDate, 'd MMM yyyy', { locale: fr })
                            : format(fromDate, 'd MMM', { locale: fr }) +
                              ' → ' +
                              format(toDate, 'd MMM yyyy', { locale: fr })}
                          {entry.preferred_time_start &&
                            ' · ' +
                              entry.preferred_time_start.slice(0, 5) +
                              (entry.preferred_time_end
                                ? '–' + entry.preferred_time_end.slice(0, 5)
                                : '')}
                        </span>
                      </div>
                    </div>

                    {entry.notification_count > 0 && (
                      <p className="mt-2 text-[10px] text-slate-400">
                        {entry.notification_count} notification{entry.notification_count > 1 ? 's' : ''} envoyée
                        {entry.notification_count > 1 ? 's' : ''}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BookingWaitlistPanel;
