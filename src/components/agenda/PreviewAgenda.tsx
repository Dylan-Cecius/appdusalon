import { getAppointmentDetails } from '@/lib/appointmentDetails';
import { appointmentContactPatch, AppointmentContactError, type AppointmentContactUpdates } from '@/lib/appointmentContactUpdate';
import { appointmentMoveIssue, moveAppointmentDraft } from '@/lib/appointmentMove';
import CreateAppointmentDialog from './CreateAppointmentDialog';
import { appointmentDraftSeries, appointmentDraftConflict } from '@/lib/appointmentDraft';
import { isTimeOffConflict, validateTimeOff, type StaffTimeOff } from '@/lib/staffTimeOff';
import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { addDays, format } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import type { Appointment, AppointmentSegment } from '@/data/appointments';
import { appointmentOccupancyOverlaps } from '@/lib/appointmentSegments';
import { findWaitlistSlots, waitlistAppointment, type WaitlistService } from '@/lib/waitlistSlots';
import type { Staff } from '@/hooks/useStaff';
import type { DaySchedule } from '@/hooks/useOpeningHours';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';
import AgendaWorkspace from './AgendaWorkspace';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const members: Staff[] = ['Dylan', 'Marie', 'Thomas'].map((name, index) => ({
  id: `demo-staff-${index}`, name, auth_user_id: null, salon_id: 'preview',
  role: 'coiffeur', color: ['#4f46e5', '#db2777', '#059669'][index],
  phone: null, email: null, commission_rate: 0, is_active: true,
  start_time: '09:00', end_time: '19:00', working_days: dayNames,
  daily_schedules: Object.fromEntries(dayNames.map(day => [day, { start: '09:00', end: '19:00' }])),
  created_at: '2026-01-01T00:00:00Z',
}));
const services: (WaitlistService & { color: string; category: 'coupe' | 'combo' })[] = [
  { id: 'demo-coupe', name: 'Coupe homme', price: 25, duration: 30, category: 'coupe' as const, color: '#4f46e5' },
  { id: 'demo-barbe', name: 'Coupe + barbe', price: 35, duration: 45, category: 'combo' as const, color: '#059669' },
  { id: 'demo-couleur', name: 'Coloration & soin', price: 75, duration: 90, category: 'coupe', color: '#db2777', steps: [
    { name: 'Application de la couleur', type: 'work', duration: 30, customerVisible: true },
    { name: 'Temps de pose', type: 'pause', duration: 30, customerVisible: true },
    { name: 'Rinçage & coiffage', type: 'work', duration: 20, customerVisible: true },
    { name: 'Nettoyage', type: 'cleanup', duration: 10, customerVisible: false },
  ] },
];
const storageKey = `appdusalon-agenda-preview-v2-${format(new Date(), 'yyyy-MM-dd')}`;
const schedule = (date: Date): DaySchedule => ({ day_of_week: (date.getDay() + 6) % 7, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null });
const refresh = async () => {};

function previewSegments(id: string, start: Date, serviceId: string): AppointmentSegment[] {
  if (serviceId !== 'demo-couleur') return [];
  let cursor = start.getTime();
  return (services.find(service => service.id === serviceId)?.steps || []).map((step, index) => {
    const startTime = new Date(cursor); cursor += step.duration * 60_000;
    return { id: `${id}-step-${index}`, label: step.name, type: step.type, startTime, endTime: new Date(cursor), occupiesStaff: step.type !== 'pause' };
  });
}

function seedAppointments(): Appointment[] {
  return ['Élodie Noël', 'Lucas Bernard', 'Emma Dubois', 'Jean Dupont', 'Julie Simon', 'Nicolas Petit', 'Sophie Martin', 'Alex Leroy', 'Camille Laurent', 'Léa Moreau', 'Maxime Denis', 'Louise Perrin', 'Arthur Simon', 'Maya André', 'Paul Robert'].map((clientName, index) => {
    const service = services[index % services.length];
    const startTime = addDays(new Date(), index < 9 ? 0 : index < 12 ? 1 : -1);
    startTime.setHours(9 + Math.floor((index % 9) / 3) * 3, index % 3 === 0 ? 30 : 0, 0, 0);
    const paymentStatus = index === 0 ? 'deposit_paid' : index === 1 ? 'paid' : 'unpaid';
    return {
      id: `demo-rdv-${index}`, clientName, clientPhone: `0000 00 00 ${String(index).padStart(2, '0')}`,
      services: [service], startTime, endTime: new Date(startTime.getTime() + service.duration * 60_000),
      status: index >= 12 ? 'completed' : 'scheduled', totalPrice: service.price,
      isPaid: index >= 12, paymentStatus: index >= 12 ? 'paid' : paymentStatus,
      amountPaid: index >= 12 || paymentStatus === 'paid' ? service.price : index === 0 ? 10 : 0,
      depositRequired: index === 0 ? 10 : 0, staffId: members[index % 3].id,
      notes: 'Rendez-vous fictif pour tester l’agenda.',
      segments: previewSegments(`demo-rdv-${index}`, startTime, service.id),
    };
  });
}

type PreviewState = { appointments: Appointment[]; waitlist: BookingWaitlistEntry[]; timeOff: StaffTimeOff[] };
function loadPreviewState(): PreviewState {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    const savedAppointments = Array.isArray(stored) ? stored : stored?.appointments;
    if (Array.isArray(savedAppointments)) {
      const restored = savedAppointments.map(item => ({ ...item, startTime: new Date(item.startTime), endTime: new Date(item.endTime) }));
      if (restored.every(item => item.id && typeof item.clientName === 'string' && Array.isArray(item.services) && Number.isFinite(item.startTime.getTime()) && Number.isFinite(item.endTime.getTime()))) return { appointments: restored, waitlist: Array.isArray(stored?.waitlist) ? stored.waitlist : seedWaitlist(), timeOff: Array.isArray(stored?.timeOff) ? stored.timeOff.map((item: StaffTimeOff) => ({ ...item, startTime: new Date(item.startTime), endTime: new Date(item.endTime) })) : [] };
    }
  } catch { /* A blocked or obsolete local store must not prevent previewing. */ }
  return { appointments: seedAppointments(), waitlist: seedWaitlist(), timeOff: [] };
}

function seedWaitlist(): BookingWaitlistEntry[] {
  return ['Alice Démo', 'Hugo Démo'].map((client_name, index) => ({
    id: `demo-wait-${index}`, salon_id: 'preview', service_id: services[index].id,
    preferred_staff_id: members[index].id, client_name, client_phone: '0000 00 00 00',
    preferred_date_from: format(new Date(), 'yyyy-MM-dd'), preferred_date_to: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    preferred_time_start: '09:00', preferred_time_end: '18:00', status: 'active',
    notification_count: 0, last_notified_at: null, offer_expires_at: null,
    created_at: new Date().toISOString(), service: { name: services[index].name }, preferred_staff: { name: members[index].name },
  }));
}

function validateAppointment(candidate: Appointment, appointments: Appointment[], timeOff: StaffTimeOff[] = []) {
  if (isTimeOffConflict(candidate, timeOff)) throw new Error('Ce collaborateur est indisponible sur cette période.');
  const start = new Date(candidate.startTime), end = new Date(candidate.endTime);
  if (!candidate.clientName.trim() || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd')) throw new Error('Vérifiez le nom et la durée du rendez-vous.');
  if (start.getHours() < 9 || end.getHours() > 19 || (end.getHours() === 19 && end.getMinutes() > 0)) throw new Error('Choisissez un horaire entre 9 h et 19 h.');
  if (appointments.some(other => other.id !== candidate.id && other.staffId === candidate.staffId && !['cancelled', 'no_show'].includes(other.status) && appointmentOccupancyOverlaps(candidate, other))) throw new Error('Ce collaborateur a déjà un rendez-vous à cet horaire.');
}

export default function PreviewAgenda() {
  const [state, setState] = useState(loadPreviewState);
  const { appointments, waitlist, timeOff } = state;
  const currentState = useRef(state);
  currentState.current = state;
  const setWaitlist = (action: SetStateAction<BookingWaitlistEntry[]>) => setState(current => ({ ...current, waitlist: typeof action === 'function' ? action(current.waitlist) : action }));
  const [revision, setRevision] = useState(0);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Session remains usable without persistence. */ } }, [state]);
  const updateAppointment = async (id: string, updates: AppointmentContactUpdates, original: Appointment) => {
    const current = currentState.current;
    const target = current.appointments.find(item => item.id === id);
    if (!target || target !== original || !['scheduled', 'pending_payment'].includes(target.status)) {
      throw new AppointmentContactError('Ce rendez-vous a changé. Copiez vos saisies et rouvrez la fiche.');
    }
    const patch = appointmentContactPatch(updates);
    const saved = { ...target,
      ...(patch.client_name !== undefined ? { clientName: patch.client_name } : {}),
      ...(patch.client_phone !== undefined ? { clientPhone: patch.client_phone } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    };
    const next = { ...current, appointments: current.appointments.map(item => item.id === id ? saved : item) };
    currentState.current = next; setState(next);
  };

  return <TooltipProvider>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
      <div><p className="text-sm font-semibold text-indigo-950">Essayez le nouvel agenda</p><p className="mt-1 text-xs text-indigo-800">La coloration inclut 30 min de pose : essayez d’y placer une coupe. Données fictives, paiements simulés.</p></div>
      <Button type="button" variant="outline" size="sm" onClick={() => { setState({ appointments: seedAppointments(), waitlist: seedWaitlist(), timeOff: [] }); setRevision(value => value + 1); toast({ title: 'Démonstration réinitialisée' }); }}><RotateCcw className="mr-2 h-3.5 w-3.5" />Réinitialiser la démo</Button>
    </div>
    <AgendaWorkspace key={revision}
      moveAppointment={async (original, candidate) => {
        const current = currentState.current;
        const issue = appointmentMoveIssue(original, candidate, { staff: members, appointments: current.appointments, timeOff: current.timeOff, schedule, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
        if (issue) throw new Error(issue);
        const existing = current.appointments.find(item => item.id === original.id)!;
        const moved = { ...moveAppointmentDraft(existing, candidate.startTime, candidate.staffId!), updatedAt: new Date().toISOString() };
        const next = { ...current, appointments: current.appointments.map(item => item.id === original.id ? moved : item) };
        currentState.current = next; setState(next);
      }}
      timeOff={timeOff}
      saveTimeOff={async (input, id) => { const current = currentState.current; validateTimeOff(input, current.timeOff, current.appointments, id); const item = { ...input, id: id || crypto.randomUUID() }; const next = { ...current, timeOff: id ? current.timeOff.map(old => old.id === id ? item : old) : [...current.timeOff, item] }; currentState.current = next; setState(next); }}
      removeTimeOff={async id => { setState(current => ({ ...current, timeOff: current.timeOff.filter(item => item.id !== id) })); }}
      appointments={appointments} appointmentsLoading={false} dbServices={services} activeStaff={members}
      getScheduleForDate={schedule} hasOpeningHours={true} waitlistEntries={waitlist} waitlistLoading={false}
      cancelWaitlistEntry={async id => { setWaitlist(current => current.filter(item => item.id !== id)); }}
      addWaitlistEntry={async entry => {
        const service = services.find(item => item.id === entry.service_id);
        if (!service) throw new Error('Prestation introuvable.');
        const member = members.find(item => item.id === entry.preferred_staff_id);
        setWaitlist(current => [...current, { ...entry, id: crypto.randomUUID(), salon_id: 'preview', status: 'active', notification_count: 0,
          last_notified_at: null, offer_expires_at: null, created_at: new Date().toISOString(), service: { name: service.name }, preferred_staff: member ? { name: member.name } : null }]);
      }}
      bookWaitlistEntry={async (entry, slot) => {
        const current = currentState.current;
        if (!current.waitlist.some(item => item.id === entry.id)) throw new Error('Cette demande a déjà été traitée.');
        const available = findWaitlistSlots(entry, { services, staff: members, appointments: current.appointments, timeOff: current.timeOff, schedule, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, limit: 5000 });
        if (!available.some(item => item.staffId === slot.staffId && item.startTime.getTime() === slot.startTime.getTime())) throw new Error('Ce créneau n’est plus disponible. Recherchez un autre horaire.');
        const appointment = { ...waitlistAppointment(entry, services.find(service => service.id === entry.service_id)!, slot), id: crypto.randomUUID() };
        validateAppointment(appointment, current.appointments, current.timeOff);
        const next = { ...current, appointments: [...current.appointments, appointment], waitlist: current.waitlist.filter(item => item.id !== entry.id) };
        currentState.current = next; setState(next);
      }}
      updateAppointment={updateAppointment} refreshAppointments={refresh}
      markAsPaid={async id => {
        const current = currentState.current;
        const target = current.appointments.find(item => item.id === id);
        const details = target && getAppointmentDetails(target);
        if (!details || (!details.canCollectBalance && !details.canCompletePrepaid)) throw new Error('Ce rendez-vous ne peut plus être encaissé.');
        const next: PreviewState = { ...current, appointments: current.appointments.map(item => item.id === id ? { ...item, status: 'completed', paymentStatus: 'paid', isPaid: true, amountPaid: item.totalPrice } : item) };
        currentState.current = next; setState(next);
        toast({ title: details.canCompletePrepaid ? 'Clôture simulée' : 'Paiement simulé', description: 'Aucun paiement réel n’a été effectué.' });
      }}
      cancelAppointment={async (id, action) => {
        const current = currentState.current;
        const target = current.appointments.find(item => item.id === id);
        if (!target || !getAppointmentDetails(target).canEdit) throw new Error('Ce rendez-vous est déjà clos.');
        const next: PreviewState = { ...current, appointments: current.appointments.map(item => item.id === id ? { ...item, status: action === 'cancel' ? 'cancelled' : 'no_show', paymentExpiresAt: undefined,
          paymentStatus: action === 'cancel' && item.paymentStatus === 'pending' ? 'expired' : item.paymentStatus } : item) };
        currentState.current = next; setState(next);
      }}
      renderCreateDialog={props => props.isOpen ? <CreateAppointmentDialog {...props} demo services={services} staff={members} appointments={appointments} timeOff={timeOff} schedule={schedule} onSave={async (draft, recurrence) => {
        const current = currentState.current;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const series = appointmentDraftSeries(draft, recurrence, timezone);
        const created: Appointment[] = [];
        const groupId = recurrence ? crypto.randomUUID() : undefined;
        for (const [index, item] of series.entries()) {
          const issue = appointmentDraftConflict(item, { staff: members, appointments: [...current.appointments, ...created], timeOff: current.timeOff, schedule, timezone });
          if (issue) throw new Error(issue);
          created.push({ ...item, id: crypto.randomUUID(), recurrenceGroupId: groupId, recurrenceIndex: recurrence ? index : undefined, recurrenceFrequency: recurrence?.frequency, recurrenceInterval: recurrence?.interval, recurrenceTotal: recurrence?.occurrences });
        }
        const next = { ...current, appointments: [...current.appointments, ...created] };
        currentState.current = next; setState(next);
        toast({ title: recurrence ? `${created.length} rendez-vous de démonstration créés` : 'Rendez-vous de démonstration créé' });
      }} /> : null}
    />
    <Toaster />
  </TooltipProvider>;
}
