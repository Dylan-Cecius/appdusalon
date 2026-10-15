import { describe, expect, it } from 'vitest';
import type { Appointment } from '@/data/appointments';
import { appointmentEditState, appointmentEditChanged, reconcileAppointmentEdit } from './appointmentEditState';
const original = { id: 'synthetic', clientName: 'Client test', clientPhone: '', updatedAt: 'revision-1' } as Appointment;
const current = { ...original, clientName: 'Modification distante', status: 'cancelled' as const, updatedAt: 'revision-2' };
describe('appointment draft reconciliation', () => {
  it('adopts new server data and revision when no draft was changed', () => {
    const next = reconcileAppointmentEdit(appointmentEditState(original), current, false);
    expect(next.base).toBe(current);
    expect(next.draft.clientName).toBe(current.clientName);
    expect(appointmentEditChanged(next)).toBe(false);
  });
  it('keeps typed values AND original revision while remote data changes', () => {
    const state = appointmentEditState(original); state.draft.notes = 'Saisie non enregistrée';
    expect(reconcileAppointmentEdit(state, current, false)).toBe(state);
    expect(state.base.updatedAt).toBe('revision-1');
  });
  it('preserves intentional clearing and a pending write', () => {
    const state = appointmentEditState({ ...original, clientPhone: '000-test' });
    state.draft.clientPhone = '';
    expect(appointmentEditChanged(state)).toBe(true);
    expect(reconcileAppointmentEdit(state, current, false)).toBe(state);
    const clean = appointmentEditState(original);
    expect(reconcileAppointmentEdit(clean, current, true)).toBe(clean);
  });
  it('does not carry a previous client draft to another appointment', () => {
    const state = appointmentEditState(original); state.draft.notes = 'Privé synthétique';
    expect(reconcileAppointmentEdit(state, { ...current, id: 'other' }, false).draft.notes).toBe('');
  });
  it('retains the same state for unchanged data and treats missing/empty notes equally', () => {
    const state = appointmentEditState(original);
    expect(appointmentEditChanged(state)).toBe(false);
    expect(reconcileAppointmentEdit(state, original, false)).toBe(state);
  });
});
