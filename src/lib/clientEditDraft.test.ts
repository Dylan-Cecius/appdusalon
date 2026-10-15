import { describe, expect, it, vi } from 'vitest';
import { clientEditPatch, saveClientEdit } from './clientEditDraft';

const draft = { id: 'client', user_id: 'owner', created_at: 'stale', name: '  Camille  ', phone: ' 0400 00 00 00 ', email: ' ', notes: 'Préférence fictive' };
describe('client edit draft', () => {
  it('sends only editable fields and permits explicit email clearing', () => {
    expect(clientEditPatch(draft, true)).toEqual({ name: 'Camille', phone: '0400 00 00 00', email: '', notes: 'Préférence fictive' });
  });
  it('omits restricted notes instead of overwriting them with an old value', () => {
    expect(clientEditPatch(draft, false)).not.toHaveProperty('notes');
  });
  it.each(['name', 'phone'] as const)('requires %s', field => {
    expect(() => clientEditPatch({ ...draft, [field]: ' ' }, true)).toThrow('requis');
  });
  it.each([null, undefined, { id: '' }, { id: 'other-client' }])('preserves the draft if confirmation does not identify the edited client %#', async result => {
    const confirmed = vi.fn(), update = vi.fn(async () => result);
    const lock = { current: false };
    await expect(saveClientEdit(lock, { id: 'client', draft, canUseNotes: true, update, confirmed })).rejects.toThrow('unconfirmed');
    expect(confirmed).not.toHaveBeenCalled();
    expect(draft.name).toBe('  Camille  ');
    expect(lock.current).toBe(false);
  });
  it('blocks a second save before rendering and applies the server result', async () => {
    let finish!: (client: { id: string; name: string }) => void;
    const update = vi.fn(() => new Promise<{ id: string; name: string }>(resolve => { finish = resolve; }));
    const confirmed = vi.fn(), lock = { current: false };
    const options = { id: 'client', draft, canUseNotes: true, update, confirmed };
    const first = saveClientEdit(lock, options);
    expect(await saveClientEdit(lock, options)).toBe(false);
    expect(update).toHaveBeenCalledOnce();
    expect(confirmed).not.toHaveBeenCalled();
    finish({ id: 'client', name: 'Camille' }); await first;
    expect(confirmed).toHaveBeenCalledWith({ id: 'client', name: 'Camille' });
  });
  it('keeps failed edits available for an explicit retry without auto retry', async () => {
    const update = vi.fn(async () => { throw new Error('offline'); });
    const confirmed = vi.fn(), lock = { current: false };
    await expect(saveClientEdit(lock, { id: 'client', draft, canUseNotes: true, update, confirmed })).rejects.toThrow('offline');
    expect(update).toHaveBeenCalledOnce(); expect(confirmed).not.toHaveBeenCalled(); expect(lock.current).toBe(false);
  });
  it('does not send an unidentified edit', async () => {
    const update = vi.fn();
    await expect(saveClientEdit({ current: false }, { id: '', draft, canUseNotes: true, update, confirmed: vi.fn() })).rejects.toThrow('missing_id');
    expect(update).not.toHaveBeenCalled();
  });
});
