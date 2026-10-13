import { fromZonedTime } from 'date-fns-tz';
import type { Appointment } from '@/data/appointments';
import { appointmentDraftConflict } from './appointmentDraft';
import { shiftAppointmentSegments } from './appointmentSegments';

export type AppointmentAvailability = Parameters<typeof appointmentDraftConflict>[1];
export function moveAppointmentDraft(appointment: Appointment, startTime: Date, staffId: string): Appointment {
  const duration = new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime();
  if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(duration) || duration <= 0) throw new Error('L’horaire ou la durée du rendez-vous est invalide.');
  return { ...appointment, startTime, endTime: new Date(startTime.getTime() + duration), staffId, segments: shiftAppointmentSegments(appointment, startTime) };
}

export function appointmentMoveIssue(original: Appointment, candidate: Appointment, context: AppointmentAvailability): string | null {
  if (candidate.id !== original.id) return 'Le rendez-vous sélectionné ne correspond pas au déplacement.';
  const current = context.appointments.find(item => item.id === original.id);
  if (!current || !['scheduled', 'pending_payment'].includes(current.status)) return 'Ce rendez-vous ne peut plus être déplacé. Actualisez l’agenda.';
  if (current.updatedAt !== original.updatedAt || current.status !== original.status || current.startTime.getTime() !== original.startTime.getTime() || current.endTime.getTime() !== original.endTime.getTime() || (current.staffId || current.barberId) !== (original.staffId || original.barberId)) return 'Ce rendez-vous a changé depuis son ouverture. Fermez cette fiche et ouvrez-le à nouveau.';
  return appointmentDraftConflict(candidate, context);
}

export function findAppointmentMoveSlots(original: Appointment, date: string, staffId: string, context: AppointmentAvailability, now = new Date()): Appointment[] {
  const results: Appointment[] = [];
  const hours = context.schedule(new Date(`${date}T12:00:00`));
  if (!hours?.is_open) return results;
  const at = (time: string) => fromZonedTime(`${date}T${time.slice(0, 5)}:00`, context.timezone).getTime();
  const first = Math.ceil(Math.max(at(hours.open_time), now.getTime()) / 900000) * 900000;
  const last = at(hours.close_time);
  // A salon day is bounded even if its configuration is invalid.
  for (let instant = first, count = 0; instant < last && count < 100; instant += 900000, count++) {
    const candidate = moveAppointmentDraft(original, new Date(instant), staffId);
    if (!appointmentMoveIssue(original, candidate, context)) results.push(candidate);
  }
  return results;
}
