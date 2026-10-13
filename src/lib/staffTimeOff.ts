import { addDays, startOfDay } from 'date-fns';
import type { Appointment } from '@/data/appointments';

export const timeOffReasons = { unavailable: 'Indisponibilité', break: 'Pause', leave: 'Congé', training: 'Formation' } as const;
export type StaffTimeOff = { id: string; staffId: string; title: string; reason: keyof typeof timeOffReasons; startTime: Date; endTime: Date };
export type TimeOffInput = Omit<StaffTimeOff, 'id'>;
export const rangesOverlap = (start: Date, end: Date, otherStart: Date, otherEnd: Date) => start < otherEnd && end > otherStart;
export const timeOffOnDay = (items: StaffTimeOff[], date: Date, staffId?: string) => items.filter(item => (!staffId || item.staffId === staffId) && rangesOverlap(item.startTime, item.endTime, startOfDay(date), addDays(startOfDay(date), 1)));
export function isTimeOffConflict(appointment: Pick<Appointment, 'startTime' | 'endTime' | 'staffId' | 'barberId'>, items: StaffTimeOff[]) {
  return items.some(item => item.staffId === (appointment.staffId || appointment.barberId) && rangesOverlap(appointment.startTime, appointment.endTime, item.startTime, item.endTime));
}
export function validateTimeOff(input: TimeOffInput, items: StaffTimeOff[], appointments: Appointment[], id?: string) {
  if (!input.staffId || !input.title.trim() || input.title.trim().length > 100 || !timeOffReasons[input.reason] || !Number.isFinite(input.startTime.getTime()) || !Number.isFinite(input.endTime.getTime()) || input.endTime <= input.startTime || input.endTime.getTime() - input.startTime.getTime() > 366 * 86400000) throw new Error('Vérifiez le motif, le collaborateur et la période (366 jours maximum).');
  if (items.some(item => item.id !== id && item.staffId === input.staffId && rangesOverlap(input.startTime, input.endTime, item.startTime, item.endTime))) throw new Error('Une indisponibilité existe déjà sur cette période.');
  if (appointments.some(item => !['cancelled', 'no_show'].includes(item.status) && isTimeOffConflict(item, [{ ...input, id: id || 'candidate' }]))) throw new Error('Un rendez-vous existe sur cette période. Déplacez-le ou annulez-le avant de bloquer le créneau.');
}
