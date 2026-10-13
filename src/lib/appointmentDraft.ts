import { addMonths, addWeeks } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { Appointment, AppointmentSegment } from '@/data/appointments';
import type { Service } from '@/hooks/useSupabaseServices';
import type { Staff } from '@/hooks/useStaff';
import type { DaySchedule } from '@/hooks/useOpeningHours';
import { appointmentOccupancyOverlaps } from './appointmentSegments';
import { isTimeOffConflict, type StaffTimeOff } from './staffTimeOff';

export type AppointmentService = Pick<Service, 'id' | 'name' | 'price' | 'duration'> & Partial<Pick<Service, 'steps' | 'appointmentBuffer' | 'color' | 'category'>>;
export type Recurrence = { frequency: 'weekly' | 'monthly'; interval: number; occurrences: number };
export function buildAppointmentDraft({ services, startTime, staffId, clientName = '', clientPhone = '', notes = '' }: {
  services: AppointmentService[]; startTime: Date; staffId: string; clientName?: string; clientPhone?: string; notes?: string;
}): Appointment {
  if (!services.length || !Number.isFinite(startTime.getTime())) throw new Error('Choisissez une prestation et un horaire.');
  let cursor = startTime.getTime(), priceCents = 0;
  const segments: AppointmentSegment[] = [];
  const snapshots = services.map((service, serviceIndex) => {
    if (!Number.isFinite(service.price) || service.price < 0) throw new Error('Le prix d’une prestation est invalide.');
    const steps = service.steps?.length ? service.steps : [{ name: service.name, type: 'work' as const, duration: service.duration }];
    const occupies = steps.some(step => step.type !== 'pause');
    let duration = 0;
    for (const [index, step] of steps.entries()) {
      if (!Number.isInteger(step.duration) || step.duration <= 0) throw new Error('La durée d’une prestation est invalide.');
      const start = new Date(cursor); cursor += step.duration * 60_000; duration += step.duration;
      segments.push({ id: `${serviceIndex}-${service.id}-${index}`, label: steps.length === 1 ? service.name : `${service.name} · ${step.name}`, type: step.type, startTime: start, endTime: new Date(cursor), occupiesStaff: step.type !== 'pause' || !occupies });
    }
    const buffer = Math.max(0, service.appointmentBuffer || 0);
    if (!Number.isInteger(buffer)) throw new Error('Le temps de préparation est invalide.');
    if (buffer > 0) {
      const start = new Date(cursor); cursor += buffer * 60_000;
      segments.push({ id: `${serviceIndex}-${service.id}-buffer`, label: `${service.name} · Préparation / nettoyage`, type: 'cleanup', startTime: start, endTime: new Date(cursor), occupiesStaff: true });
    }
    const price = Math.round(service.price * 100) / 100; priceCents += Math.round(price * 100);
    return { id: service.id, name: service.name, price, duration, appointmentBuffer: buffer, category: (service.category || 'coupe') as Appointment['services'][number]['category'] };
  });
  return { id: 'appointment-draft', clientName: clientName.trim(), clientPhone: clientPhone.trim(), notes: notes.trim(), staffId, services: snapshots, startTime, endTime: new Date(cursor), segments, status: 'scheduled', paymentStatus: 'unpaid', totalPrice: priceCents / 100, amountPaid: 0, isPaid: false };
}

export function appointmentDraftSeries(draft: Appointment, recurrence: Recurrence | null, timezone: string): Appointment[] {
  if (!recurrence) return [draft];
  if (!['weekly', 'monthly'].includes(recurrence.frequency) || !Number.isInteger(recurrence.interval) || recurrence.interval < 1 || recurrence.interval > 12 || !Number.isInteger(recurrence.occurrences) || recurrence.occurrences < 2 || recurrence.occurrences > 52) throw new Error('Choisissez une série de 2 à 52 rendez-vous et un intervalle de 1 à 12.');
  const wallStart = toZonedTime(draft.startTime, timezone);
  return Array.from({ length: recurrence.occurrences }, (_, index) => {
    const date = recurrence.frequency === 'weekly' ? addWeeks(wallStart, index * recurrence.interval) : addMonths(wallStart, index * recurrence.interval);
    const startTime = fromZonedTime(date, timezone), delta = startTime.getTime() - draft.startTime.getTime();
    return { ...draft, id: `draft-${index}`, startTime, endTime: new Date(draft.endTime.getTime() + delta), segments: draft.segments?.map(segment => ({ ...segment, startTime: new Date(segment.startTime.getTime() + delta), endTime: new Date(segment.endTime.getTime() + delta) })) };
  });
}

export function appointmentDraftConflict(draft: Appointment, { staff, appointments, timeOff, schedule, timezone }: {
  staff: Staff[]; appointments: Appointment[]; timeOff: StaffTimeOff[]; schedule: (date: Date) => DaySchedule | null; timezone: string;
}): string | null {
  const member = staff.find(item => item.id === draft.staffId && item.is_active);
  if (!member) return 'Choisissez un collaborateur disponible.';
  const date = formatInTimeZone(draft.startTime, timezone, 'yyyy-MM-dd');
  if (formatInTimeZone(draft.endTime, timezone, 'yyyy-MM-dd') !== date) return 'Les prestations doivent se terminer le même jour.';
  const calendarDate = new Date(`${date}T12:00:00`), hours = schedule(calendarDate);
  if (!hours) return 'Les horaires du salon doivent être renseignés pour vérifier ce créneau.';
  if (!hours.is_open) return 'Le salon est fermé ce jour-là.';
  const at = (time: string) => fromZonedTime(`${date}T${time.slice(0, 5)}:00`, timezone);
  if (draft.startTime < at(hours.open_time) || draft.endTime > at(hours.close_time)) return 'Les prestations débordent des horaires d’ouverture du salon.';
  if (hours.break_start && hours.break_end && draft.startTime < at(hours.break_end) && draft.endTime > at(hours.break_start)) return 'Ce créneau recouvre une pause du salon.';
  const day = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][calendarDate.getDay()];
  const work = member.daily_schedules[day];
  if (!work || draft.startTime < at(work.start) || draft.endTime > at(work.end)) return 'Ce collaborateur ne travaille pas sur toute cette période.';
  if (isTimeOffConflict(draft, timeOff)) return 'Ce collaborateur est indisponible sur cette période.';
  if (appointments.some(item => item.id !== draft.id && (item.staffId || item.barberId) === draft.staffId && !['cancelled', 'no_show'].includes(item.status) && appointmentOccupancyOverlaps(draft, item))) return 'Ce collaborateur a déjà un rendez-vous à cet horaire.';
  return null;
}
