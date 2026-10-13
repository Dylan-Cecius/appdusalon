import { describe, expect, it } from 'vitest';
import type { Staff } from '@/hooks/useStaff';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';
import { findWaitlistSlots, waitlistAppointment, type WaitlistService } from './waitlistSlots';

const date = (time: string) => new Date(`2026-10-13T${time}:00Z`);
const service: WaitlistService = { id: 'cut', name: 'Coupe', price: 25, duration: 30 };
const staff: Staff[] = [{
  id: 'a', auth_user_id: null, salon_id: 'salon', name: 'A', role: 'Coiffeur', color: '#dbeafe',
  phone: null, email: null, commission_rate: 0, is_active: true,
  start_time: '09:00', end_time: '19:00', working_days: ['Tuesday'], created_at: '2026-10-01T00:00:00Z',
  daily_schedules: { Tuesday: { start: '09:00', end: '19:00' } },
}];
const entry = { id: 'entry', client_name: 'Client', client_phone: '00000000', service_id: 'cut', preferred_staff_id: 'a', status: 'active',
  preferred_date_from: '2026-10-13', preferred_date_to: '2026-10-13', preferred_time_start: '09:00', preferred_time_end: '11:00' } as BookingWaitlistEntry;
const hours = { day_of_week: 1, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null };
const options = { services: [service], staff, appointments: [], schedule: () => hours, timezone: 'UTC', now: date('08:00') };

describe('waitlist slot suggestions', () => {
  it('offers chronological slots whose whole service fits the preferred window', () => {
    const slots = findWaitlistSlots(entry, options);
    expect(slots).toHaveLength(6);
    expect(slots[0].startTime).toEqual(date('09:00'));
    expect(slots.every(slot => slot.endTime <= date('11:00'))).toBe(true);
  });
  it('excludes elapsed slots, closed days, missing schedules and absent staff', () => {
    expect(findWaitlistSlots(entry, { ...options, now: date('09:00') })[0].startTime).toEqual(date('09:15'));
    expect(findWaitlistSlots(entry, { ...options, schedule: () => null })).toEqual([]);
    expect(findWaitlistSlots(entry, { ...options, schedule: () => ({ ...hours, is_open: false }) })).toEqual([]);
    expect(findWaitlistSlots({ ...entry, preferred_staff_id: 'other' }, options)).toEqual([]);
    expect(findWaitlistSlots(entry, { ...options, staff: [{ ...staff[0], daily_schedules: {} }] })).toEqual([]);
  });
  it('respects salon breaks, staff closing time and cleanup buffers', () => {
    const slots = findWaitlistSlots(entry, { ...options, services: [{ ...service, appointmentBuffer: 15 }],
      staff: [{ ...staff[0], daily_schedules: { Tuesday: { start: '09:00', end: '10:30' } } }],
      schedule: () => ({ ...hours, break_start: '09:45', break_end: '10:00' }) });
    expect(slots.map(slot => slot.startTime)).toEqual([date('09:00')]);
  });
  it('uses only actual free processing windows and leaves work protected', () => {
    const color = waitlistAppointment(entry, { ...service, duration: 90, steps: [
      { name: 'Application', type: 'work', duration: 30, customerVisible: true },
      { name: 'Pose', type: 'pause', duration: 30, customerVisible: true },
      { name: 'Rinçage', type: 'work', duration: 30, customerVisible: true },
    ] }, { staffId: 'a', startTime: date('09:00') });
    const slots = findWaitlistSlots({ ...entry, preferred_time_end: '10:30' }, { ...options, appointments: [color] });
    expect(slots.map(slot => slot.startTime)).toEqual([date('09:30')]);
    expect(findWaitlistSlots({ ...entry, preferred_time_end: '10:30' }, { ...options, appointments: [{ ...color, segments: [] }] })).toEqual([]);
  });
  it('returns no slots for inactive requests or missing services', () => {
    expect(findWaitlistSlots({ ...entry, status: 'booked' }, options)).toEqual([]);
    expect(findWaitlistSlots(entry, { ...options, services: [] })).toEqual([]);
  });
  it('interprets preferences in the salon timezone', () => {
    const slots = findWaitlistSlots(entry, { ...options, timezone: 'Europe/Brussels', now: date('06:00') });
    expect(slots[0].startTime).toEqual(date('07:00'));
  });
  it('does not create a free window for an all-pause service', () => {
    const appointment = waitlistAppointment(entry, { ...service, steps: [{ name: 'Pose', type: 'pause', duration: 30, customerVisible: true }] }, { staffId: 'a', startTime: date('09:00') });
    expect(appointment.segments![0].occupiesStaff).toBe(true);
  });
});
