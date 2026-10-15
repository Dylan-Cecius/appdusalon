import { useAgendaClients } from '@/hooks/useAgendaClients';
import { useStaffTimeOff } from '@/hooks/useStaffTimeOff';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { useOpeningHours } from '@/hooks/useOpeningHours';
import { useStaff } from '@/hooks/useStaff';
import { useBookingWaitlist } from '@/hooks/useBookingWaitlist';
import CreateAppointmentDialog from './CreateAppointmentDialog';
import AgendaWorkspace from './AgendaWorkspace';

export default function ProAgenda() {
  const { scopeKey, appointments, loading, error: appointmentsError, addAppointment, addRecurringAppointments, updateAppointment, moveAppointment, markAsPaid, cancelAppointment, refreshAppointments } = useSupabaseAppointments();
  const { services, loading: servicesLoading } = useSupabaseServices();
  const { getScheduleForDate, hasData, loading: hoursLoading } = useOpeningHours();
  const { activeStaff, isLoading: staffLoading } = useStaff();
  const waitlist = useBookingWaitlist();
  const timeOff = useStaffTimeOff();
  const contacts = useAgendaClients();

  return <AgendaWorkspace key={scopeKey}
    moveAppointment={moveAppointment} availabilityLoading={staffLoading || hoursLoading}
    clients={contacts.clients} clientsLoading={contacts.loading} clientsError={contacts.error} appointmentsError={appointmentsError}
    timeOff={timeOff.entries} timeOffLoading={timeOff.loading} timeOffError={timeOff.error}
    saveTimeOff={timeOff.canManage ? timeOff.save : undefined} removeTimeOff={timeOff.canManage ? timeOff.remove : undefined}
    appointments={appointments}
    appointmentsLoading={loading}
    dbServices={services}
    activeStaff={activeStaff}
    getScheduleForDate={getScheduleForDate}
    hasOpeningHours={hasData}
    waitlistEntries={waitlist.entries}
    waitlistLoading={waitlist.loading}
    cancelWaitlistEntry={waitlist.cancelEntry}
    addWaitlistEntry={waitlist.addEntry}
    bookWaitlistEntry={async (entry, slot) => { await waitlist.bookEntry(entry, slot); await refreshAppointments(); }}
    waitlistTimezone="Europe/Brussels"
    updateAppointment={updateAppointment}
    markAsPaid={markAsPaid}
    cancelAppointment={cancelAppointment}
    refreshAppointments={refreshAppointments}
    renderCreateDialog={props => props.isOpen ? <CreateAppointmentDialog {...props} services={services} staff={activeStaff} appointments={appointments} timeOff={timeOff.entries} schedule={getScheduleForDate} timezone="Europe/Brussels"
      unavailable={loading || !!appointmentsError || servicesLoading || staffLoading || hoursLoading || timeOff.loading || timeOff.error}
      onSave={async (draft, recurrence) => {
        if (recurrence) await addRecurringAppointments({ appointment: draft, ...recurrence });
        else { const created = await addAppointment(draft); if (!created) throw new Error('Le rendez-vous n’a pas été enregistré. Reconnectez-vous et réessayez.'); }
        await refreshAppointments();
      }} /> : null}
  />;
}
