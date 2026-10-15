import { describe, expect, it } from 'vitest';
import { createPreviewSession, decodePreviewState, previewStorageKey, seedPreviewState } from './state';
import { agendaServices, legacyPreviewServiceIds, previewServices } from './data';

const store = (initial: string | null = null) => {
  let value = initial;
  return { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } };
};
describe('preview storage compatibility', () => {
  it('retains the local daily key', () => expect(previewStorageKey(new Date(2026, 9, 15, 23))).toBe('appdusalon-agenda-preview-v2-2026-10-15'));
  it('does not mutate a missing store while loading', () => {
    const storage = store(); const seed = seedPreviewState();
    expect(createPreviewSession(storage, 'k', seed).getState()).toBe(seed);
    expect(storage.getItem()).toBeNull();
  });
  it('restores legacy arrays including saved price, service steps, segments and recurrence', () => {
    const seed = seedPreviewState(); const item = { ...seed.appointments[2], totalPrice: 61, recurrenceGroupId: 'group', recurrenceIndex: 2 };
    const result = decodePreviewState(JSON.stringify([item]), seed);
    expect(result.appointments).toEqual([item]);
    expect(result.appointments[0].segments?.[0].startTime).toBeInstanceOf(Date);
    expect(result.waitlist).toEqual(seed.waitlist);
  });
  it('preserves empty lists instead of reseeding removed requests', () => {
    const result = decodePreviewState(JSON.stringify({ appointments: [], waitlist: [], timeOff: [] }), seedPreviewState());
    expect(result.appointments).toEqual([]); expect(result.waitlist).toEqual([]);
  });
  it('roundtrips absences and pending payment expiry', () => {
    const seed = seedPreviewState();
    seed.timeOff = [{ id: 'off', staffId: 'demo-staff-0', reason: 'leave', title: 'Congé', startTime: new Date('2026-10-20T08:00:00Z'), endTime: new Date('2026-10-21T08:00:00Z') }];
    seed.appointments[0].paymentExpiresAt = new Date('2026-10-15T18:00:00Z');
    expect(decodePreviewState(JSON.stringify(seed), seed)).toEqual(seed);
  });
  it.each(['{', 'null', '{"version":2,"appointments":[]}', '{"version":1,"appointments":[]}', '{"appointments":[],"timeOff":null}'])('preserves unreadable/future storage: %s', raw => {
    const storage = store(raw); const seed = seedPreviewState(); const session = createPreviewSession(storage, 'k', seed);
    expect(session.getWarning()).toBeTruthy(); session.commit({ ...seed, appointments: [] });
    expect(storage.getItem()).toBe(raw);
  });
  it('rejects malformed dates and duplicate identities without partially restoring', () => {
    const seed = seedPreviewState();
    expect(() => decodePreviewState(JSON.stringify({ ...seed, appointments: [{ ...seed.appointments[0], startTime: null }] }), seed)).toThrow();
    expect(() => decodePreviewState(JSON.stringify({ ...seed, appointments: [seed.appointments[0], seed.appointments[0]] }), seed)).toThrow();
  });
  it('preserves all previous POS offers, keeping simple coloration distinct from multi-step care', () => {
    expect(Object.values(legacyPreviewServiceIds).every(id => previewServices.some(item => item.id === id))).toBe(true);
    expect(previewServices.find(s => s.id === legacyPreviewServiceIds.s5)?.price).toBe(55);
    expect(agendaServices.find(s => s.id === 'demo-couleur')?.steps).toHaveLength(4);
  });
  it('does not overwrite another tab and does not publish failed writes', () => {
    const storage = store(); const seed = seedPreviewState(); const session = createPreviewSession(storage, 'k', seed);
    storage.setItem('k', 'external');
    expect(() => session.commit({ ...seed, appointments: [] })).toThrow(/autre onglet/);
    expect(session.getState()).toBe(seed); expect(storage.getItem()).toBe('external');
  });
  it('retains the previous state on quota failure and allows retry', () => {
    const seed = seedPreviewState(); const storage = store(); let fail = true;
    const session = createPreviewSession({ ...storage, setItem: (key, value) => { if (fail) throw Error('quota'); storage.setItem(key, value); } }, 'k', seed);
    const next = { ...seed, appointments: [] };
    expect(() => session.commit(next)).toThrow(/Enregistrement/); expect(session.getState()).toBe(seed);
    fail = false; session.commit(next); expect(session.getState()).toBe(next);
  });
  it('keeps session usable when storage access is blocked', () => {
    const seed = seedPreviewState(); const session = createPreviewSession({ getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('must not write'); } }, 'k', seed);
    session.commit({ ...seed, appointments: [] }); expect(session.getState().appointments).toEqual([]);
    expect(session.getWarning()).toMatch(/onglet/);
  });
});
