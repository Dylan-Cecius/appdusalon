import { describe, expect, it } from 'vitest';
import { confirmedTimeOffId } from './timeOffMutationResult';
describe('time-off mutation confirmation', () => {
  it('confirms a new row or the exact updated/deleted row', () => {
    expect(confirmedTimeOffId({ id: 'synthetic' })).toBe('synthetic');
    expect(confirmedTimeOffId({ id: 'synthetic' }, 'synthetic')).toBe('synthetic');
  });
  it.each([null, undefined, {}, { id: '' }, { id: 12 }, [{ id: 'synthetic' }]])('rejects an unidentified response: %j', data => {
    expect(() => confirmedTimeOffId(data)).toThrow('non confirmée');
  });
  it('rejects a different row for an edit or removal', () => {
    expect(() => confirmedTimeOffId({ id: 'other' }, 'synthetic')).toThrow('non confirmée');
  });
});
