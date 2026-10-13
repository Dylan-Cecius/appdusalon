import { describe, it, expect } from 'vitest';
import { isTimeOffConflict, timeOffOnDay, validateTimeOff, type StaffTimeOff } from './staffTimeOff';
import { waitlistAppointment, findWaitlistSlots } from './waitlistSlots';
import type { Staff } from '@/hooks/useStaff';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';
const at = (time: string) => new Date(`2026-10-13T${time}:00Z`);
const off: StaffTimeOff = { id: 'off', staffId: 'a', reason: 'leave', title: 'Congé', startTime: at('10:00'), endTime: at('11:00') };
const entry = { id: 'entry', client_name: 'Test', client_phone: '00000000', service_id: 'cut', preferred_staff_id: 'a', status: 'active', preferred_date_from: '2026-10-13', preferred_date_to: '2026-10-13', preferred_time_start: '09:00', preferred_time_end: '12:00' } as BookingWaitlistEntry;
const service = { id: 'cut', name: 'Coupe', price: 25, duration: 30 };
const staff: Staff = { id: 'a', name: 'A', auth_user_id: null, salon_id: 'salon', role: 'coiffeur', color: '#000000', phone: null, email: null, commission_rate: 0, is_active: true, start_time: '09:00', end_time: '19:00', working_days: ['Tuesday'], daily_schedules: { Tuesday: { start: '09:00', end: '19:00' } }, created_at: '' };
describe('staff time off', () => {
  it('rejects any overlap but allows touching boundaries and other staff', () => {
    expect(isTimeOffConflict({ staffId: 'a', startTime: at('09:30'), endTime: at('10:00') }, [off])).toBe(false);
    expect(isTimeOffConflict({ staffId: 'a', startTime: at('09:45'), endTime: at('10:15') }, [off])).toBe(true);
    expect(isTimeOffConflict({ staffId: 'b', startTime: at('10:00'), endTime: at('10:30') }, [off])).toBe(false);
  });
  it('shows multi-day absences on each overlapping day, excluding their end boundary', () => {
    const span = { ...off, startTime: new Date('2026-10-13T00:00:00'), endTime: new Date('2026-10-15T00:00:00') };
    expect(timeOffOnDay([span], new Date('2026-10-14T12:00:00'))).toHaveLength(1);
    expect(timeOffOnDay([span], new Date('2026-10-15T12:00:00'))).toHaveLength(0);
  });
  it('rejects invalid periods and overlapping blocks while allowing an unchanged edit', () => {
    expect(() => validateTimeOff({ ...off, endTime: at('09:00') }, [], [])).toThrow();
    expect(() => validateTimeOff(off, [off], [])).toThrow('existe déjà');
    expect(() => validateTimeOff(off, [off], [], off.id)).not.toThrow();
  });
  it('requires rescheduling existing appointments, even when only a processing phase overlaps', () => {
    const appointment = waitlistAppointment(entry, { ...service, steps: [{ name: 'Travail', type: 'work', duration: 30, customerVisible: true }, { name: 'Pose', type: 'pause', duration: 30, customerVisible: true }, { name: 'Fin', type: 'work', duration: 30, customerVisible: true }] }, { staffId: 'a', startTime: at('09:30') });
    expect(() => validateTimeOff({ ...off, endTime: at('10:30') }, [], [appointment])).toThrow('rendez-vous');
    expect(() => validateTimeOff(off, [], [{ ...appointment, status: 'cancelled' }])).not.toThrow();
  });
  it('removes unavailable staff slots from waitlist suggestions', () => {
    const slots = findWaitlistSlots(entry, { services: [service], staff: [staff], appointments: [], timeOff: [off], schedule: () => ({ day_of_week: 1, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null }), timezone: 'UTC', now: at('08:00'), limit: 20 });
    expect(slots.some(slot => slot.startTime.getTime() === at('11:00').getTime())).toBe(true);
    expect(slots.every(slot => !isTimeOffConflict(slot, [off]))).toBe(true);
  });
});
