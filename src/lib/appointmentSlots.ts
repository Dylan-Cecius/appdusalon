import { addDays, format } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { Appointment } from '@/data/appointments';
import { appointmentDraftConflict, appointmentDraftSeries, buildAppointmentDraft, type AppointmentService, type Recurrence } from './appointmentDraft';
import { moveAppointmentDraft, type AppointmentAvailability } from './appointmentMove';

export type AppointmentSlot = { staffId: string; staffName: string; startTime: Date; endTime: Date };

export function appointmentSeriesIssue(series: Appointment[], context: AppointmentAvailability): string | null {
  for (const [index, item] of series.entries()) {
    const issue = appointmentDraftConflict(item, { ...context, appointments: [...context.appointments, ...series.slice(0, index)] });
    if (issue) return (series.length > 1 ? `${formatInTimeZone(item.startTime, context.timezone, 'dd/MM/yyyy HH:mm')} : ` : '') + issue;
  }
  return null;
}

// Search one salon week at a time, in chronological order, without reserving a slot.
export function findAppointmentSlots({ services, dateFrom, staffId, recurrence = null, now = new Date(), limit = 12 }: {
  services: AppointmentService[]; dateFrom: string; staffId?: string; recurrence?: Recurrence | null; now?: Date; limit?: number;
}, context: AppointmentAvailability): { slots: AppointmentSlot[]; hasMore: boolean } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) throw new Error('Choisissez une date de départ valide.');
  const first = new Date(`${dateFrom}T12:00:00`);
  if (!Number.isFinite(first.getTime()) || format(first, 'yyyy-MM-dd') !== dateFrom) throw new Error('Choisissez une date de départ valide.');
  const cap = Number.isInteger(limit) ? Math.min(48, Math.max(1, limit)) : 12;
  const template = buildAppointmentDraft({ services, startTime: fromZonedTime(`${dateFrom}T12:00:00`, context.timezone), staffId: staffId || '' });
  appointmentDraftSeries(template, recurrence, context.timezone); // Validate recurrence even when the week is closed.
  const members = context.staff.filter(member => member.is_active && (!staffId || member.id === staffId))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr') || a.id.localeCompare(b.id))
    .map(member => ({ member, availability: { ...context, appointments: context.appointments.filter(item => (item.staffId || item.barberId) === member.id), timeOff: context.timeOff.filter(item => item.staffId === member.id) } }));
  const slots: AppointmentSlot[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(first, offset), key = format(day, 'yyyy-MM-dd'), hours = context.schedule(day);
    if (!hours?.is_open) continue;
    const at = (time: string) => fromZonedTime(`${key}T${time.slice(0, 5)}:00`, context.timezone).getTime();
    const earliest = Math.ceil(Math.max(at(hours.open_time), now.getTime() + 1) / 900000) * 900000;
    const latest = at(hours.close_time);
    for (let instant = earliest, attempts = 0; instant < latest && attempts < 100; instant += 900000, attempts++) {
      for (const { member, availability } of members) {
        const candidate = moveAppointmentDraft(template, new Date(instant), member.id);
        const series = appointmentDraftSeries(candidate, recurrence, context.timezone);
        if (appointmentSeriesIssue(series, availability)) continue;
        if (slots.length === cap) return { slots, hasMore: true };
        slots.push({ staffId: member.id, staffName: member.name, startTime: candidate.startTime, endTime: candidate.endTime });
      }
    }
  }
  return { slots, hasMore: false };
}
