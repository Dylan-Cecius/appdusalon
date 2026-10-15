import { describe, expect, it, vi } from 'vitest';
import { clientCreateFields, clientWriteFields, persistClientEdit } from './clientPersistence';
const client = { id: 'client', salon_id: 'salon', user_id: 'owner', name: 'Alex', phone: '04', created_at: '2026-01-01', updated_at: 'revision-2' };
function apiResult(data: typeof client | null, error: unknown = null) {
  const query = { eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error }) };
  query.eq.mockReturnValue(query); query.select.mockReturnValue(query);
  const update = vi.fn().mockReturnValue(query); const from = vi.fn().mockReturnValue({ update });
  return { api: { from }, query, update };
}
describe('restricted client edits', () => {
  it('requires a name and phone for creation, without forwarding identity', () => {
    expect(() => clientCreateFields({ name: 'Alex' }, false)).toThrow('required');
    expect(clientCreateFields(client, false)).toEqual({ name: 'Alex', phone: '04' });
  });
  it('sends only editable fields, trims them and clears optional values', () => {
    expect(clientWriteFields({ ...client, email: '', notes: ' note ', birth_date: '' }, true)).toEqual({ name: 'Alex', phone: '04', email: null, notes: 'note', birth_date: null });
  });
  it('omits notes when the plan does not permit them', () => { expect(clientWriteFields({ name: ' Alex ', notes: 'secret' }, false)).toEqual({ name: 'Alex' }); });
  it.each([{ name: ' ' }, { phone: '' }, { birth_date: '2026-02-30' }, { email: 'invalid' }])('rejects invalid input', input => { expect(() => clientWriteFields(input, true)).toThrow(); });
  it('conditions the update on identity, salon and the revision opened for editing', async () => {
    const { api, query, update } = apiResult(client);
    expect(await persistClientEdit(api, 'salon', 'client', 'revision-1', { name: 'Alex' }, true)).toEqual(client);
    expect(query.eq.mock.calls).toEqual([['id', 'client'], ['salon_id', 'salon'], ['updated_at', 'revision-1']]);
    expect(update).toHaveBeenCalledWith({ name: 'Alex' });
  });
  it('rejects a stale revision returning no row', async () => { await expect(persistClientEdit(apiResult(null).api, 'salon', 'client', 'old', { name: 'Alex' }, true)).rejects.toThrow('not_confirmed'); });
  it('rejects an unrelated confirmation', async () => { await expect(persistClientEdit(apiResult({ ...client, salon_id: 'other' }).api, 'salon', 'client', 'old', { name: 'Alex' }, true)).rejects.toThrow('not_confirmed'); });
  it('propagates failure and refuses a missing revision before writing', async () => {
    const { api, update } = apiResult(client, new Error('denied'));
    await expect(persistClientEdit(api, 'salon', 'client', '', { name: 'Alex' }, true)).rejects.toThrow('revision_required');
    expect(update).not.toHaveBeenCalled();
    await expect(persistClientEdit(api, 'salon', 'client', 'old', { name: 'Alex' }, true)).rejects.toThrow('denied');
  });
});
