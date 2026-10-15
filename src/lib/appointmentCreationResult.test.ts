import { describe, expect, it } from 'vitest';
import { confirmedAppointmentCreation } from './appointmentCreationResult';
const row = { id: 'synthetic-1', salon_id: 'salon-test' };
describe('appointment creation confirmation', () => {
  it('accepts one identified reservation from the requested salon', () => {
    expect(confirmedAppointmentCreation(row, 'salon-test')).toEqual([row]);
  });
  it.each([null, undefined, {}, [], [row, row], { ...row, id: '' }, { ...row, salon_id: 'other' }, { ...row, id: 123 }])('rejects an unconfirmed result: %j', data => {
    expect(() => confirmedAppointmentCreation(data, 'salon-test')).toThrow('Vérifiez l’agenda');
  });
  it('requires every occurrence and one common recurrence group', () => {
    const first = { ...row, recurrence_group_id: 'group-test' };
    const second = { ...first, id: 'synthetic-2' };
    expect(confirmedAppointmentCreation([first, second], 'salon-test', 2, true)).toEqual([first, second]);
    for (const data of [[first], [first, first], [first, { ...second, salon_id: 'other' }], [first, { ...second, recurrence_group_id: 'other' }], [row, second]]) {
      expect(() => confirmedAppointmentCreation(data, 'salon-test', 2, true)).toThrow('confirmée');
    }
  });
});
