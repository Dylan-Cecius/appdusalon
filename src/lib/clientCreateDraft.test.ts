import { describe, expect, it } from 'vitest';
import { clientCreateInput, type ClientCreateDraft } from './clientCreateDraft';

const draft: ClientCreateDraft = { name: '  Élodie  ', phone: '  0400 00 00 00  ', email: '', birth_date: '', notes: 'Préférence conservée' };

describe('new client payload', () => {
  it('omits optional empty values from the JSON request, especially PostgreSQL dates', () => {
    expect(JSON.parse(JSON.stringify(clientCreateInput(draft, true)))).toEqual({ name: 'Élodie', phone: '0400 00 00 00', notes: 'Préférence conservée' });
    expect(draft.name).toBe('  Élodie  ');
  });
  it('preserves an entered birth date and trims email without discarding permitted notes', () => {
    expect(clientCreateInput({ ...draft, email: '  test@example.test  ', birth_date: '1994-07-13' }, true)).toMatchObject({ email: 'test@example.test', birth_date: '1994-07-13', notes: draft.notes });
  });
  it('does not submit restricted notes even if the draft contains them', () => {
    expect(clientCreateInput(draft, false).notes).toBe('');
  });
  it('rejects whitespace-only required fields before calling a backend', () => {
    expect(() => clientCreateInput({ ...draft, name: '  ' }, true)).toThrow('requis');
    expect(() => clientCreateInput({ ...draft, phone: '  ' }, true)).toThrow('requis');
  });
});
