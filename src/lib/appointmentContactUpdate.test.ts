import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Appointment } from '@/data/appointments';
import { appointmentContactPatch, persistAppointmentContactUpdate } from './appointmentContactUpdate';

const original = { id: 'rdv-1', updatedAt: '2026-10-15T10:00:00Z' } as Appointment;
function database(data: unknown, error: unknown = null) {
  const query = {
    update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  const client = { from: vi.fn().mockReturnValue(query) };
  return { client: client as unknown as SupabaseClient, from: client.from, query };
}

describe('appointment contact persistence', () => {
  it('preserves intentional clears without changing reservation or payment fields', () => {
    expect(appointmentContactPatch({ clientName: '  Élodie  ', clientPhone: '', notes: '' })).toEqual({ client_name: 'Élodie', client_phone: '', notes: '' });
    expect(appointmentContactPatch({ notes: '  Note libre  ' })).toEqual({ notes: '  Note libre  ' });
    expect(appointmentContactPatch({ clientPhone: '   ' })).toEqual({ client_phone: '' });
    expect(appointmentContactPatch({ notes: 'Note', totalPrice: 1, isPaid: true } as Parameters<typeof appointmentContactPatch>[0])).toEqual({ notes: 'Note' });
  });
  it('rejects empty names and empty patches before writing', async () => {
    const db = database(null);
    for (const draft of [{ clientName: '  ' }, {}]) {
      await expect(persistAppointmentContactUpdate(db.client, 'salon-1', original, draft)).rejects.toThrow();
    }
    expect(db.query.update).not.toHaveBeenCalled();
  });
  it('scopes the write to the salon and the revision originally opened, returning server values', async () => {
    const db = database({ client_name: 'Élodie', client_phone: '', notes: 'Note', updated_at: 'new-revision' });
    const result = await persistAppointmentContactUpdate(db.client, 'salon-1', original, { clientPhone: '' });
    expect(db.query.eq.mock.calls).toEqual([['id', 'rdv-1'], ['salon_id', 'salon-1'], ['updated_at', original.updatedAt]]);
    expect(db.query.in).toHaveBeenCalledWith('status', ['scheduled', 'pending_payment']);
    expect(result).toEqual({ clientName: 'Élodie', clientPhone: '', notes: 'Note', updatedAt: 'new-revision' });
  });
  it('rejects a missing, inaccessible or concurrently changed row instead of reporting success', async () => {
    const db = database(null);
    await expect(persistAppointmentContactUpdate(db.client, 'salon-1', original, { notes: 'Draft' })).rejects.toThrow('a changé ou n’est plus accessible');
  });
  it('propagates a database failure without inventing saved values', async () => {
    const error = { message: 'permission denied', code: '42501' };
    const db = database(null, error);
    await expect(persistAppointmentContactUpdate(db.client, 'salon-1', original, { notes: 'Draft' })).rejects.toBe(error);
  });
  it('does not query without a salon or an original revision', async () => {
    const db = database(null);
    await expect(persistAppointmentContactUpdate(db.client, '', original, { notes: 'Draft' })).rejects.toThrow('Actualisez');
    await expect(persistAppointmentContactUpdate(db.client, 'salon-1', { ...original, updatedAt: undefined }, { notes: 'Draft' })).rejects.toThrow('Actualisez');
    expect(db.from).not.toHaveBeenCalled();
  });
});
