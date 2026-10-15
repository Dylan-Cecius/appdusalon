import { getAppointmentDetails } from '@/lib/appointmentDetails';
import { appointmentContactPatch, AppointmentContactError, type AppointmentContactUpdates } from '@/lib/appointmentContactUpdate';
import { appointmentMoveIssue, moveAppointmentDraft } from '@/lib/appointmentMove';
import CreateAppointmentDialog from './CreateAppointmentDialog';
import { appointmentDraftSeries, appointmentDraftConflict } from '@/lib/appointmentDraft';
import { isTimeOffConflict, validateTimeOff, type StaffTimeOff } from '@/lib/staffTimeOff';
import { useState, type SetStateAction } from 'react';
import { usePreview } from '@/preview/PreviewProvider';
import { previewMembers as members, previewServices as services } from '@/preview/data';
import type { PreviewState } from '@/preview/state';
import { format } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import type { Appointment } from '@/data/appointments';
import { appointmentOccupancyOverlaps } from '@/lib/appointmentSegments';
import { findWaitlistSlots, waitlistAppointment } from '@/lib/waitlistSlots';
import type { DaySchedule } from '@/hooks/useOpeningHours';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';
import AgendaWorkspace from './AgendaWorkspace';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const schedule = (date: Date): DaySchedule => ({ day_of_week: (date.getDay() + 6) % 7, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null });
const refresh = async () => {};

function validateAppointment(candidate: Appointment, appointments: Appointment[], timeOff: StaffTimeOff[] = []) {
  if (isTimeOffConflict(candidate, timeOff)) throw new Error('Ce collaborateur est indisponible sur cette période.');
  const start = new Date(candidate.startTime), end = new Date(candidate.endTime);
  if (!candidate.clientName.trim() || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd')) throw new Error('Vérifiez le nom et la durée du rendez-vous.');
  if (start.getHours() < 9 || end.getHours() > 19 || (end.getHours() === 19 && end.getMinutes() > 0)) throw new Error('Choisissez un horaire entre 9 h et 19 h.');
  if (appointments.some(other => other.id !== candidate.id && other.staffId === candidate.staffId && !['cancelled', 'no_show'].includes(other.status) && appointmentOccupancyOverlaps(candidate, other))) throw new Error('Ce collaborateur a déjà un rendez-vous à cet horaire.');
}

export default function PreviewAgenda() {
  const { state, setState, currentState, reset } = usePreview();
  const { appointments, waitlist, timeOff } = state;
  const setWaitlist = (action: SetStateAction<BookingWaitlistEntry[]>) => setState(current => ({ ...current, waitlist: typeof action === 'function' ? action(current.waitlist) : action }));
  const [revision, setRevision] = useState(0);
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
    setState(next);
  };

  return <TooltipProvider>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
      <div><p className="text-sm font-semibold text-indigo-950">Essayez le nouvel agenda</p><p className="mt-1 text-xs text-indigo-800">La coloration inclut 30 min de pose : essayez d’y placer une coupe. Données fictives, paiements simulés.</p></div>
      <Button type="button" variant="outline" size="sm" onClick={() => { try { reset(); setRevision(value => value + 1); toast({ title: 'Démonstration réinitialisée', description: 'Agenda, panier et tickets fictifs restaurés.' }); } catch { /* Provider displays the persistence error. */ } }}><RotateCcw className="mr-2 h-3.5 w-3.5" />Réinitialiser la démo</Button>
    </div>
    <AgendaWorkspace key={revision}
      moveAppointment={async (original, candidate) => {
        const current = currentState.current;
        const issue = appointmentMoveIssue(original, candidate, { staff: members, appointments: current.appointments, timeOff: current.timeOff, schedule, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
        if (issue) throw new Error(issue);
        const existing = current.appointments.find(item => item.id === original.id)!;
        const moved = { ...moveAppointmentDraft(existing, candidate.startTime, candidate.staffId!), updatedAt: new Date().toISOString() };
        const next = { ...current, appointments: current.appointments.map(item => item.id === original.id ? moved : item) };
        setState(next);
      }}
      timeOff={timeOff}
      saveTimeOff={async (input, id) => { const current = currentState.current; validateTimeOff(input, current.timeOff, current.appointments, id); const item = { ...input, id: id || crypto.randomUUID() }; const next = { ...current, timeOff: id ? current.timeOff.map(old => old.id === id ? item : old) : [...current.timeOff, item] }; setState(next); }}
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
        setState(next);
      }}
      updateAppointment={updateAppointment} refreshAppointments={refresh}
      markAsPaid={async id => {
        const current = currentState.current;
        const target = current.appointments.find(item => item.id === id);
        const details = target && getAppointmentDetails(target);
        if (!details || (!details.canCollectBalance && !details.canCompletePrepaid)) throw new Error('Ce rendez-vous ne peut plus être encaissé.');
        const next: PreviewState = { ...current, appointments: current.appointments.map(item => item.id === id ? { ...item, status: 'completed', paymentStatus: 'paid', isPaid: true, amountPaid: item.totalPrice } : item) };
        setState(next);
        toast({ title: details.canCompletePrepaid ? 'Clôture simulée' : 'Paiement simulé', description: 'Aucun paiement réel n’a été effectué.' });
      }}
      cancelAppointment={async (id, action) => {
        const current = currentState.current;
        const target = current.appointments.find(item => item.id === id);
        if (!target || !getAppointmentDetails(target).canEdit) throw new Error('Ce rendez-vous est déjà clos.');
        const next: PreviewState = { ...current, appointments: current.appointments.map(item => item.id === id ? { ...item, status: action === 'cancel' ? 'cancelled' : 'no_show', paymentExpiresAt: undefined,
          paymentStatus: action === 'cancel' && item.paymentStatus === 'pending' ? 'expired' : item.paymentStatus } : item) };
        setState(next);
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
        setState(next);
        toast({ title: recurrence ? `${created.length} rendez-vous de démonstration créés` : 'Rendez-vous de démonstration créé' });
      }} /> : null}
    />
    <Toaster />
  </TooltipProvider>;
}
