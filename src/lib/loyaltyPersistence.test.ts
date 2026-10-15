import { describe, expect, it, vi } from 'vitest';
import { loyaltyFields, loyaltyDraft, persistLoyaltyProgram, type LoyaltyWriter } from './loyaltyPersistence';
import { defaultLoyaltyProgram } from './loyaltyRead';
const fields = { enabled: true, points_per_euro: 1.5, reward_threshold: 200, reward_value: 5.25, birthday_bonus: 10 };
const old = '2026-10-15T12:00:00.000Z'; const next = '2026-10-15T13:00:00.000Z';
function fake(data: unknown = { ...fields, salon_id: 's', updated_at: next }, error: unknown = null) {
  const query = { eq: vi.fn(), select: vi.fn() }; query.eq.mockReturnValue(query); query.select.mockReturnValue({ maybeSingle: () => Promise.resolve({ data, error }) });
  const table = { insert: vi.fn(() => query), update: vi.fn(() => query) };
  const api: LoyaltyWriter = { from: vi.fn(() => table) }; return { api, table, query };
}
describe('loyalty settings persistence', () => {
  it('accepts decimal comma and preserves zero values', () => { expect(loyaltyFields({ ...loyaltyDraft(defaultLoyaltyProgram('s')), points_per_euro: '1,125', reward_value: '0', birthday_bonus: '0' })).toMatchObject({ points_per_euro: 1.125, reward_value: 0, birthday_bonus: 0 }); });
  it.each([{points_per_euro:''},{points_per_euro:'Infinity'},{points_per_euro:'100.001'},{reward_threshold:'0'},{reward_threshold:'1.5'},{reward_threshold:'1000001'},{reward_value:'-1'},{reward_value:'0.001'},{birthday_bonus:'1.1'},{birthday_bonus:'2147483648'}])('rejects invalid input without coercion: %j', patch => {
    expect(() => loyaltyFields({...loyaltyDraft(defaultLoyaltyProgram('s')), ...patch})).toThrow();
  });
  it('updates only allowed fields under salon and captured revision', async () => {
    const f = fake(); await persistLoyaltyProgram(f.api,'s',old,{...fields, salon_id:'other'} as typeof fields,new Date(next));
    expect(f.table.update).toHaveBeenCalledWith({...fields,updated_at:next});expect(f.query.eq.mock.calls).toEqual([['salon_id','s'],['updated_at',old]]);expect(f.table.insert).not.toHaveBeenCalled();
  });
  it('inserts a missing program without an overwriting upsert', async () => { const f=fake(); await persistLoyaltyProgram(f.api,'s',null,fields,new Date(next));expect(f.table.insert).toHaveBeenCalledWith({...fields,salon_id:'s',updated_at:next});expect(f.table.update).not.toHaveBeenCalled(); });
  it.each([null,{...fields,salon_id:'other',updated_at:next},{...fields,salon_id:'s',updated_at:old},{...fields,salon_id:'s',updated_at:next,reward_value:99}])('does not confirm absent or mismatched results', async data=>{const f=fake(data);await expect(persistLoyaltyProgram(f.api,'s',old,fields)).rejects.toThrow();});
  it('propagates a concurrent insertion or RLS failure', async()=>{const f=fake(null,new Error('conflict'));await expect(persistLoyaltyProgram(f.api,'s',null,fields)).rejects.toThrow('conflict');});
  it('advances the revision even if the local clock has not advanced',async()=>{const f=fake();await persistLoyaltyProgram(f.api,'s',old,fields,new Date(old));expect(f.table.update).toHaveBeenCalledWith({...fields,updated_at:'2026-10-15T12:00:00.001Z'});});
  it('rejects invalid fields before making a query',async()=>{const f=fake();await expect(persistLoyaltyProgram(f.api,'s',old,{...fields,reward_threshold:0})).rejects.toThrow();expect(f.api.from).not.toHaveBeenCalled();});
});
