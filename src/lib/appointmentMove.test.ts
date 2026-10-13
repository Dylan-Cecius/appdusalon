import { describe, expect, it } from 'vitest';
import { buildAppointmentDraft } from './appointmentDraft';
import { appointmentMoveIssue, findAppointmentMoveSlots, moveAppointmentDraft, type AppointmentAvailability } from './appointmentMove';
import type { Staff } from '@/hooks/useStaff';

const original = { ...buildAppointmentDraft({ services: [{ id: 'color', name: 'Couleur', price: 75, duration: 90, steps: [
  { name: 'Travail', type: 'work', duration: 30, customerVisible: true }, { name: 'Pose', type: 'pause', duration: 30, customerVisible: true },
  { name: 'Finition', type: 'work', duration: 30, customerVisible: true },
] }], startTime: new Date('2026-10-13T09:00Z'), staffId: 'a', notes: 'À conserver' }), id: 'original', paymentStatus: 'deposit_paid' as const, amountPaid: 20, recurrenceGroupId: 'series', recurrenceIndex: 1, updatedAt: 'revision-1' };
const staff: Staff[] = ['a', 'b'].map(id => ({ id, auth_user_id: null, salon_id: 'salon', name: id, role: 'Coiffeur', color: '#dbeafe', phone: null, email: null, commission_rate: 0, is_active: true,
  start_time: '09:00', end_time: '19:00', working_days: ['Tuesday','Wednesday'], created_at: '', daily_schedules: { Tuesday: { start: '09:00', end: '19:00' }, Wednesday: { start: '09:00', end: '19:00' } } }));
const context: AppointmentAvailability = { staff, appointments: [original], timeOff: [], timezone: 'UTC', schedule: () => ({ day_of_week: 1, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null }) };
describe('appointment moves', () => {
  it('moves the snapshot with payments, notes, service prices and series identity intact', () => {
    const moved = moveAppointmentDraft(original, new Date('2026-10-14T17:00Z'), 'b');
    expect(moved.endTime.toISOString()).toBe('2026-10-14T18:30:00.000Z');
    expect(moved.segments![1].startTime.toISOString()).toBe('2026-10-14T17:30:00.000Z');
    expect(moved.segments![1].occupiesStaff).toBe(false);
    expect(moved.services).toEqual(original.services);
    expect(moved.totalPrice).toBe(75); expect(moved.amountPaid).toBe(20); expect(moved.notes).toBe('À conserver');
    expect(moved.recurrenceGroupId).toBe('series'); expect(moved.recurrenceIndex).toBe(1);
    expect(original.startTime.toISOString()).toBe('2026-10-13T09:00:00.000Z');
  });
  it('does not treat the original appointment as its own conflict', () => {
    expect(appointmentMoveIssue(original, moveAppointmentDraft(original, original.startTime, 'a'), context)).toBeNull();
  });
  it('rejects stale, removed and completed appointments before saving', () => {
    const moved = moveAppointmentDraft(original, new Date('2026-10-14T17:00Z'), 'b');
    expect(appointmentMoveIssue(original, moved, { ...context, appointments: [{ ...original, updatedAt: 'revision-2' }] })).toContain('a changé');
    expect(appointmentMoveIssue(original, moved, { ...context, appointments: [] })).toContain('ne peut plus');
    expect(appointmentMoveIssue(original, moved, { ...context, appointments: [{ ...original, status: 'completed' }] })).toContain('ne peut plus');
  });
  it('checks the complete duration, absences and occupied phases of another member', () => {
    expect(appointmentMoveIssue(original, moveAppointmentDraft(original, new Date('2026-10-14T18:00Z'), 'b'), context)).toContain('horaires d’ouverture');
    const occupied = { ...moveAppointmentDraft(original, new Date('2026-10-14T17:00Z'), 'b'), id: 'other' };
    expect(appointmentMoveIssue(original, { ...occupied, id: original.id }, { ...context, appointments: [original, occupied] })).toContain('déjà un rendez-vous');
    expect(appointmentMoveIssue(original, { ...occupied, id: original.id }, { ...context, timeOff: [{ id: 'off', staffId: 'b', title: 'Formation', reason: 'training', startTime: occupied.startTime, endTime: occupied.endTime }] })).toContain('indisponible');
  });
  it('offers future quarter-hour slots fitting the saved duration and excludes a time-off block', () => {
    const slots = findAppointmentMoveSlots(original, '2026-10-14', 'b', { ...context, timeOff: [{ id: 'off', staffId: 'b', title: 'Congé', reason: 'leave', startTime: new Date('2026-10-14T12:00Z'), endTime: new Date('2026-10-14T14:00Z') }] }, new Date('2026-10-14T10:07Z'));
    expect(slots[0].startTime.toISOString()).toBe('2026-10-14T10:15:00.000Z');
    expect(slots.every(item => item.endTime <= new Date('2026-10-14T12:00Z') || item.startTime >= new Date('2026-10-14T14:00Z'))).toBe(true);
    expect(slots.at(-1)!.endTime.toISOString()).toBe('2026-10-14T19:00:00.000Z');
  });
  it('falls back to full occupancy when saved phases are incomplete', () => {
    const incomplete = { ...original, segments: original.segments!.slice(0, 1) };
    expect(moveAppointmentDraft(incomplete, new Date('2026-10-14T17:00Z'), 'b').segments).toEqual([]);
    expect(() => moveAppointmentDraft(original, new Date('invalid'), 'b')).toThrow();
  });
});
