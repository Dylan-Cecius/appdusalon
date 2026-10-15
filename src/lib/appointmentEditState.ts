import type { Appointment } from '@/data/appointments';
import type { AppointmentContactUpdates } from './appointmentContactUpdate';

export type AppointmentEditState = { base: Appointment; draft: AppointmentContactUpdates };
export function appointmentEditState(base: Appointment): AppointmentEditState {
  return { base, draft: { clientName: base.clientName, clientPhone: base.clientPhone || '', notes: base.notes || '' } };
}
export function appointmentEditChanged(state: AppointmentEditState) {
  return (['clientName', 'clientPhone', 'notes'] as const).some(key => (state.draft[key] || '') !== (state.base[key] || ''));
}
/** Keep the original optimistic revision with a dirty/pending draft. */
export function reconcileAppointmentEdit(state: AppointmentEditState | null, current: Appointment, pending: boolean) {
  if (!state || state.base.id !== current.id) return appointmentEditState(current);
  if (pending || appointmentEditChanged(state) || state.base === current) return state;
  return appointmentEditState(current);
}
