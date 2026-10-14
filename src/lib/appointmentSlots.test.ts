import { describe, expect, it } from 'vitest';
import { formatInTimeZone } from 'date-fns-tz';
import type { Staff } from '@/hooks/useStaff';
import { buildAppointmentDraft, type AppointmentService } from './appointmentDraft';
import { findAppointmentSlots } from './appointmentSlots';
import type { AppointmentAvailability } from './appointmentMove';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const member: Staff = { id: 'a', auth_user_id: null, salon_id: 's', name: 'Alice', role: 'Coiffeur', color: null,
  phone: null, email: null, commission_rate: 0, is_active: true, start_time: '09:00', end_time: '19:00',
  working_days: weekdays, created_at: '', daily_schedules: Object.fromEntries(weekdays.map(day => [day, { start: '09:00', end: '19:00' }])) };
const cut: AppointmentService = { id: 'cut', name: 'Coupe', duration: 30, price: 25 };
const color: AppointmentService = { id: 'color', name: 'Couleur', duration: 90, price: 75, steps: [
  { name: 'Application', type: 'work', duration: 30, customerVisible: true },
  { name: 'Pose', type: 'pause', duration: 30, customerVisible: true },
  { name: 'Finition', type: 'cleanup', duration: 30, customerVisible: true },
] };
const hours = { day_of_week: 1, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null };
const context: AppointmentAvailability = { staff: [member], appointments: [], timeOff: [], schedule: () => hours, timezone: 'UTC' };
const request = { services: [cut], dateFrom: '2026-10-13', now: new Date('2026-10-13T09:00:00Z'), limit: 12 };
const hh = (date: Date) => formatInTimeZone(date, 'UTC', 'HH:mm');

describe('new appointment slot search', () => {
  it('orders the whole team chronologically and excludes past slots and retired staff', () => {
    const result = findAppointmentSlots(request, { ...context, staff: [{ ...member, id: 'b', name: 'Bob' }, { ...member, id: 'old', is_active: false }, member] });
    expect(result.slots.slice(0, 4).map(slot => [hh(slot.startTime), slot.staffName])).toEqual([['09:15', 'Alice'], ['09:15', 'Bob'], ['09:30', 'Alice'], ['09:30', 'Bob']]);
    expect(result.hasMore).toBe(true);
    expect(result.slots.every(slot => slot.staffId !== 'old' && slot.startTime > request.now)).toBe(true);
    expect(findAppointmentSlots({ ...request, staffId: 'b' }, { ...context, staff: [member] }).slots).toEqual([]);
  });
  it('only offers full composed durations including cleaning within salon and staff hours', () => {
    const result = findAppointmentSlots({ ...request, services: [color, { ...cut, appointmentBuffer: 15 }], now: new Date('2026-10-13T16:30:00Z') }, context);
    expect(result.slots[0].startTime.toISOString()).toBe('2026-10-13T16:45:00.000Z');
    expect(hh(result.slots[0].endTime)).toBe('19:00');
    expect(result.slots[1].startTime.toISOString()).toBe('2026-10-14T09:00:00.000Z');
  });
  it('can fill a saved free processing phase, but never its cleanup or an incomplete snapshot', () => {
    const existing = { ...buildAppointmentDraft({ services: [color], startTime: new Date('2026-10-13T09:00:00Z'), staffId: 'a' }), id: 'saved' };
    const available = findAppointmentSlots(request, { ...context, appointments: [existing] }).slots;
    expect(hh(available[0].startTime)).toBe('09:30');
    expect(hh(available[1].startTime)).toBe('10:30');
    const legacy = findAppointmentSlots(request, { ...context, appointments: [{ ...existing, segments: [] }] }).slots;
    expect(hh(legacy[0].startTime)).toBe('10:30');
  });
  it('excludes salon breaks, partial employee shifts, days off and time off', () => {
    const result = findAppointmentSlots(request, { ...context,
      schedule: day => ({ ...hours, is_open: day.getDay() !== 3, break_start: '10:00', break_end: '11:00' }),
      staff: [{ ...member, daily_schedules: { Tuesday: { start: '09:30', end: '12:00' }, Thursday: { start: '09:00', end: '19:00' } } }],
      timeOff: [{ id: 'off', staffId: 'a', title: 'Absence', reason: 'leave', startTime: new Date('2026-10-13T09:00:00Z'), endTime: new Date('2026-10-13T10:00:00Z') }],
    });
    expect(result.slots.slice(0, 3).map(slot => hh(slot.startTime))).toEqual(['11:00', '11:15', '11:30']);
    expect(result.slots[3].startTime.toISOString()).toBe('2026-10-15T09:00:00.000Z');
  });
  it('checks every recurring occurrence and skips an apparently free time with a future conflict', () => {
    const occupied = { ...buildAppointmentDraft({ services: [cut], startTime: new Date('2026-10-20T09:00:00Z'), staffId: 'a' }), id: 'saved' };
    const result = findAppointmentSlots({ ...request, recurrence: { frequency: 'weekly', interval: 1, occurrences: 3 } }, { ...context, appointments: [occupied] });
    expect(hh(result.slots[0].startTime)).toBe('09:30');
  });
  it('keeps salon wall-clock hours across daylight saving for search days and series', () => {
    const local = { ...context, timezone: 'Europe/Brussels', timeOff: [{ id: 'off', staffId: 'a', title: 'Absence', reason: 'leave' as const, startTime: new Date('2026-10-27T08:00:00Z'), endTime: new Date('2026-10-27T09:00:00Z') }] };
    const result = findAppointmentSlots({ ...request, dateFrom: '2026-10-20', now: new Date('2026-10-20T06:00:00Z'), recurrence: { frequency: 'weekly', interval: 1, occurrences: 2 } }, local);
    expect(result.slots[0].startTime.toISOString()).toBe('2026-10-20T08:00:00.000Z');
    expect(formatInTimeZone(result.slots[0].startTime, local.timezone, 'HH:mm')).toBe('10:00');
  });
  it('limits the window to seven days and returns an honest empty state', () => {
    const result = findAppointmentSlots(request, { ...context, schedule: date => ({ ...hours, is_open: date.getDate() === 20 }) });
    expect(result).toEqual({ slots: [], hasMore: false });
    expect(findAppointmentSlots({ ...request, dateFrom: '2026-10-20' }, context).slots[0].startTime.toISOString()).toBe('2026-10-20T09:00:00.000Z');
  });
  it('rejects invalid dates, services and recurrences, including a completely closed week', () => {
    expect(() => findAppointmentSlots({ ...request, dateFrom: '2026-02-30' }, context)).toThrow('date');
    expect(() => findAppointmentSlots({ ...request, services: [] }, context)).toThrow('prestation');
    expect(() => findAppointmentSlots({ ...request, services: [{ ...cut, duration: 0 }] }, context)).toThrow('durée');
    expect(() => findAppointmentSlots({ ...request, recurrence: { frequency: 'weekly', interval: 1, occurrences: 100 } }, { ...context, schedule: () => null })).toThrow('série');
  });
  it('recalculates from fresh availability and keeps the selected employee restriction', () => {
    const first = findAppointmentSlots({ ...request, staffId: 'a', limit: 1 }, { ...context, staff: [member, { ...member, id: 'b', name: 'Bob' }] }).slots[0];
    const occupied = { ...buildAppointmentDraft({ services: [cut], staffId: 'a', startTime: first.startTime }), id: 'new' };
    const result = findAppointmentSlots({ ...request, staffId: 'a', limit: 1 }, { ...context, appointments: [occupied], staff: [member, { ...member, id: 'b', name: 'Bob' }] });
    expect(result.slots[0].startTime > first.startTime).toBe(true);
    expect(result.slots[0].staffId).toBe('a');
  });
});
