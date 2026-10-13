import { describe, expect, it } from 'vitest';
import { formatInTimeZone } from 'date-fns-tz';
import type { Staff } from '@/hooks/useStaff';
import { appointmentDraftConflict, appointmentDraftSeries, buildAppointmentDraft, type AppointmentService } from './appointmentDraft';

const cut: AppointmentService = { id: 'cut', name: 'Coupe', price: 25.10, duration: 30, appointmentBuffer: 5 };
const color: AppointmentService = { id: 'color', name: 'Couleur', price: 75.20, duration: 90, steps: [
  { name: 'Application', type: 'work', duration: 30, customerVisible: true },
  { name: 'Pose', type: 'pause', duration: 30, customerVisible: true },
  { name: 'Rinçage', type: 'work', duration: 20, customerVisible: true },
  { name: 'Nettoyage', type: 'cleanup', duration: 10, customerVisible: false },
] };
const start = new Date('2026-10-13T09:00:00Z');
const draft = (services = [cut], startTime = start) => buildAppointmentDraft({ services, startTime, staffId: 'a' });
const member: Staff = { id: 'a', auth_user_id: null, salon_id: 'salon', name: 'A', role: 'Coiffeur', color: '#dbeafe',
  phone: null, email: null, commission_rate: 0, is_active: true, start_time: '09:00', end_time: '19:00',
  working_days: ['Tuesday'], created_at: '2026-10-01T00:00:00Z', daily_schedules: { Tuesday: { start: '09:00', end: '19:00' } } };
const hours = { day_of_week: 1, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null };
const context = { staff: [member], appointments: [], timeOff: [], schedule: () => hours, timezone: 'UTC' };

describe('appointment composer', () => {
  it('sequences the selected services, their steps and buffers with exact totals', () => {
    const result = draft([cut, color]);
    expect(result.totalPrice).toBe(100.30);
    expect(result.endTime.toISOString()).toBe('2026-10-13T11:05:00.000Z');
    expect(result.segments!.map(item => item.type)).toEqual(['work', 'cleanup', 'work', 'pause', 'work', 'cleanup']);
    expect(result.segments![2].startTime.toISOString()).toBe('2026-10-13T09:35:00.000Z');
    expect(result.services.map(item => item.duration)).toEqual([30, 90]);
    expect(draft([color, cut]).segments![0].label).toContain('Couleur');
  });
  it('keeps all-pause services occupied even next to a working service', () => {
    const result = draft([cut, { ...color, steps: [color.steps![1]] }]);
    expect(result.segments!.every(item => item.occupiesStaff)).toBe(true);
  });
  it('rejects invalid catalog data rather than advertising a slot', () => {
    expect(() => draft([])).toThrow();
    expect(() => draft([{ ...cut, duration: 0 }])).toThrow();
    expect(() => draft([{ ...cut, price: NaN }])).toThrow();
  });
  it('checks full duration against salon and staff hours, breaks and missing schedules', () => {
    const late = draft([cut, color], new Date('2026-10-13T18:00:00Z'));
    expect(appointmentDraftConflict(late, context)).toContain('horaires d’ouverture');
    expect(appointmentDraftConflict(draft(), { ...context, schedule: () => null })).toContain('renseignés');
    expect(appointmentDraftConflict(draft(), { ...context, schedule: () => ({ ...hours, is_open: false }) })).toContain('fermé');
    expect(appointmentDraftConflict(draft(), { ...context, schedule: () => ({ ...hours, break_start: '09:30', break_end: '10:00' }) })).toContain('pause');
    expect(appointmentDraftConflict(draft(), { ...context, staff: [{ ...member, daily_schedules: {} }] })).toContain('ne travaille pas');
  });
  it('accepts free processing, rejects cleanup and treats absence as a full block', () => {
    const existing = { ...draft([color]), id: 'existing' };
    const duringPose = draft([{ ...cut, appointmentBuffer: 0 }], new Date('2026-10-13T09:30:00Z'));
    expect(appointmentDraftConflict(duringPose, { ...context, appointments: [existing] })).toBeNull();
    expect(appointmentDraftConflict(draft([cut], duringPose.startTime), { ...context, appointments: [existing] })).toContain('déjà un rendez-vous');
    expect(appointmentDraftConflict(duringPose, { ...context, timeOff: [{ id: 'off', staffId: 'a', title: 'Congé', reason: 'leave', startTime: start, endTime: existing.endTime }] })).toContain('indisponible');
  });
  it('keeps the salon hour and phase lengths across a weekly DST change', () => {
    const series = appointmentDraftSeries(draft([cut], new Date('2026-10-20T08:00:00Z')), { frequency: 'weekly', interval: 1, occurrences: 3 }, 'Europe/Brussels');
    expect(series.map(item => formatInTimeZone(item.startTime, 'Europe/Brussels', 'HH:mm'))).toEqual(['10:00', '10:00', '10:00']);
    expect(series[1].startTime.toISOString()).toBe('2026-10-27T09:00:00.000Z');
    expect(series.every(item => item.endTime.getTime() - item.startTime.getTime() === 35 * 60000)).toBe(true);
    expect(series[1].segments![1].endTime).toEqual(series[1].endTime);
  });
  it('clamps month-end dates from the original date and validates series bounds', () => {
    const series = appointmentDraftSeries(draft([cut], new Date('2027-01-31T09:00:00Z')), { frequency: 'monthly', interval: 1, occurrences: 3 }, 'Europe/Brussels');
    expect(series.map(item => formatInTimeZone(item.startTime, 'Europe/Brussels', 'yyyy-MM-dd HH:mm'))).toEqual(['2027-01-31 10:00', '2027-02-28 10:00', '2027-03-31 10:00']);
    expect(() => appointmentDraftSeries(draft(), { frequency: 'weekly', interval: 0, occurrences: 4 }, 'UTC')).toThrow();
    expect(() => appointmentDraftSeries(draft(), { frequency: 'weekly', interval: 1, occurrences: 53 }, 'UTC')).toThrow();
  });
});
