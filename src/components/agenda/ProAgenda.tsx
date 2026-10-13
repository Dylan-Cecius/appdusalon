import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { useOpeningHours } from '@/hooks/useOpeningHours';
import { useStaff } from '@/hooks/useStaff';
import { useBookingWaitlist } from '@/hooks/useBookingWaitlist';
import AppointmentModal from '../AppointmentModal';
import AgendaWorkspace from './AgendaWorkspace';

export default function ProAgenda() {
  const { appointments, loading, updateAppointment, markAsPaid, cancelAppointment, refreshAppointments } = useSupabaseAppointments();
  const { services } = useSupabaseServices();
  const { getScheduleForDate, hasData } = useOpeningHours();
  const { activeStaff } = useStaff();
  const waitlist = useBookingWaitlist();

  return <AgendaWorkspace
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
    renderCreateDialog={props => <AppointmentModal {...props} />}
  />;
}
