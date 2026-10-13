import { isTimeOffConflict, type StaffTimeOff } from './staffTimeOff';
import { addDays, format } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { Appointment } from '@/data/appointments';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';
import { buildAppointmentDraft, type AppointmentService } from './appointmentDraft';
import type { Staff } from '@/hooks/useStaff';
import type { DaySchedule } from '@/hooks/useOpeningHours';
import { appointmentOccupancyOverlaps } from './appointmentSegments';

export type WaitlistService = AppointmentService;
export type WaitlistRequest = Pick<BookingWaitlistEntry, 'client_name' | 'client_phone' | 'service_id' | 'preferred_staff_id' | 'preferred_date_from' | 'preferred_date_to' | 'preferred_time_start' | 'preferred_time_end'>;
export type WaitlistSlot = { staffId: string; staffName: string; startTime: Date; endTime: Date };
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function waitlistAppointment(entry: WaitlistRequest, service: WaitlistService, slot: Pick<WaitlistSlot, 'staffId' | 'startTime'>): Appointment {
  return buildAppointmentDraft({ services: [service], startTime: slot.startTime, staffId: slot.staffId, clientName: entry.client_name, clientPhone: entry.client_phone });
}

export function findWaitlistSlots(entry: BookingWaitlistEntry, { services, staff, appointments, schedule, timezone, timeOff = [], now = new Date(), limit = 6 }: {
  services: WaitlistService[]; staff: Staff[]; appointments: Appointment[]; timeOff?: StaffTimeOff[];
  schedule: (date: Date) => DaySchedule | null; timezone: string; now?: Date; limit?: number;
}): WaitlistSlot[] {
  const service = services.find(item => item.id === entry.service_id);
  if (!service || !['active', 'notified'].includes(entry.status)) return [];
  const today = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  const first = new Date(`${entry.preferred_date_from > today ? entry.preferred_date_from : today}T12:00:00`);
  if (!Number.isFinite(first.getTime())) return [];
  const results: WaitlistSlot[] = [];
  for (let day = 0; day < 31; day++) {
    const date = addDays(first, day), dateKey = format(date, 'yyyy-MM-dd');
    if (dateKey > entry.preferred_date_to) break;
    const hours = schedule(date);
    if (!hours?.is_open) continue;
    const at = (time: string) => fromZonedTime(`${dateKey}T${time.slice(0, 5)}:00`, timezone);
    for (const member of staff) {
      if (!member.is_active || (entry.preferred_staff_id && member.id !== entry.preferred_staff_id)) continue;
      const work = member.daily_schedules?.[weekdays[date.getDay()]];
      if (!work) continue;
      const earliest = [hours.open_time, work.start, entry.preferred_time_start || '00:00'].map(t => t.slice(0, 5)).sort().at(-1)!;
      const latest = [hours.close_time, work.end, entry.preferred_time_end || '23:59'].map(t => t.slice(0, 5)).sort()[0];
      const lower = Math.max(at(earliest).getTime(), now.getTime() + 1);
      const upper = at(latest).getTime();
      const start = Math.ceil(lower / 900_000) * 900_000;
      for (let instant = start; instant < upper; instant += 900_000) {
        const startTime = new Date(instant);
        let candidate: Appointment;
        try { candidate = waitlistAppointment(entry, service, { staffId: member.id, startTime }); } catch { return []; }
        if (candidate.endTime.getTime() > upper) break;
        if (isTimeOffConflict(candidate, timeOff)) continue;
        if (hours.break_start && hours.break_end && startTime < at(hours.break_end) && candidate.endTime > at(hours.break_start)) continue;
        if (appointments.some(other => (other.staffId || other.barberId) === member.id && !['cancelled', 'no_show'].includes(other.status) && appointmentOccupancyOverlaps(candidate, other))) continue;
        results.push({ staffId: member.id, staffName: member.name, startTime, endTime: candidate.endTime });
        // Each staff member only needs enough candidates to fill the final list.
        if (results.filter(slot => slot.staffId === member.id).length >= limit) break;
      }
    }
    if (results.length >= limit) break;
  }
  return results.sort((a, b) => a.startTime.getTime() - b.startTime.getTime() || a.staffName.localeCompare(b.staffName)).slice(0, limit);
}
