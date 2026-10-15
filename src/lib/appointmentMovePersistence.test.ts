import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Appointment } from '@/data/appointments';
import { persistAppointmentMove } from './appointmentMovePersistence';
const original = { id: 'test-rdv', updatedAt: 'rev-1', status: 'scheduled', startTime: new Date('2026-10-15T10:00:00Z'), endTime: new Date('2026-10-15T10:30:00Z') } as Appointment;
const candidate = { ...original, staffId: 'test-staff', startTime: new Date('2026-10-16T10:00:00Z'), endTime: new Date('2026-10-16T10:30:00Z') };
function database(data: unknown, error: unknown = null) {
  const query = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data, error }) };
  return { query, client: { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient };
}
describe('confirmed appointment move', () => {
  it('writes only scheduling fields with salon/revision/status guards', async () => {
    const { client, query } = database({ id: original.id });
    await persistAppointmentMove(client, 'test-salon', original, { ...candidate, totalPrice: 1, isPaid: true }, () => true);
    expect(query.update).toHaveBeenCalledWith({ start_time: candidate.startTime.toISOString(), end_time: candidate.endTime.toISOString(), staff_id: candidate.staffId });
    expect(query.eq.mock.calls).toEqual([['id', original.id], ['salon_id', 'test-salon'], ['updated_at', 'rev-1']]);
    expect(query.in).toHaveBeenCalledWith('status', ['scheduled', 'pending_payment']);
  });
  it.each([null, {}, { id: 'other' }])('rejects an absent or mismatched confirmation: %j', async data => {
    const { client } = database(data);
    await expect(persistAppointmentMove(client, 'test-salon', original, candidate, () => true)).rejects.toThrow('non confirmé');
  });
  it('does not write an old context and does not confirm a late response', async () => {
    const { client, query } = database({ id: original.id });
    await expect(persistAppointmentMove(client, 'test-salon', original, candidate, () => false)).rejects.toThrow('Actualisez');
    expect(query.update).not.toHaveBeenCalled();
    let active = true;
    query.maybeSingle.mockImplementation(async () => { active = false; return { data: { id: original.id }, error: null }; });
    await expect(persistAppointmentMove(client, 'test-salon', original, candidate, () => active)).rejects.toThrow('session');
  });
  it('rejects invalid identities, durations and closed appointments before writing', async () => {
    const { client, query } = database({ id: original.id });
    for (const changed of [{ ...candidate, id: 'other' }, { ...candidate, staffId: '' }, { ...candidate, startTime: new Date('invalid') }, { ...candidate, endTime: candidate.startTime }]) {
      await expect(persistAppointmentMove(client, 'test-salon', original, changed, () => true)).rejects.toThrow();
    }
    await expect(persistAppointmentMove(client, 'test-salon', { ...original, status: 'cancelled' }, candidate, () => true)).rejects.toThrow();
    expect(query.update).not.toHaveBeenCalled();
  });
  it('propagates database refusal without confirming the move', async () => {
    const failure = { message: 'synthetic conflict' };
    const { client } = database(null, failure);
    await expect(persistAppointmentMove(client, 'test-salon', original, candidate, () => true)).rejects.toBe(failure);
  });
});
