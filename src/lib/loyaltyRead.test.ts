import { describe, expect, it, vi } from 'vitest';
import { readLoyaltySnapshot, defaultLoyaltyProgram, type LoyaltyReader } from './loyaltyRead';
import { createLatestRequestScope } from './latestRequestScope';
const program = { ...defaultLoyaltyProgram('s'), enabled: true, updated_at: '2026-10-15T12:00:00Z', points_per_euro: '1.5' };
const account = { id: 'a', salon_id: 's', client_id: 'c', points_balance: '12', lifetime_earned: 20, lifetime_redeemed: 8 };
const event = { id: 'e', salon_id: 's', client_id: 'c', loyalty_account_id: 'a', event_type: 'reversal', points_delta: -8, monetary_value: '0', note: null, created_at: '2026-10-15T12:00:00Z' };
const result = (data: unknown, error: unknown = null) => Promise.resolve({ data, error });
const reader = (): LoyaltyReader => ({ program: vi.fn(() => result(program)), account: vi.fn(() => result(account)), events: vi.fn(() => result([event])) });
describe('loyalty coherent reads', () => {
  it('returns normalized program/account/recent events after all reads', async () => {
    const r = reader(); const snapshot = await readLoyaltySnapshot(r, 's', 'c', () => true);
    expect(snapshot?.program.points_per_euro).toBe(1.5); expect(snapshot?.account?.points_balance).toBe(12); expect(snapshot?.events[0].points_delta).toBe(-8); expect(r.events).toHaveBeenCalledWith('a');
  });
  it('uses disabled defaults only for a successful missing program', async () => {
    const r = reader(); r.program = () => result(null);
    expect((await readLoyaltySnapshot(r, 's', undefined, () => true))?.program).toEqual(defaultLoyaltyProgram('s'));
    expect(r.account).not.toHaveBeenCalled(); expect(r.events).not.toHaveBeenCalled();
  });
  it('treats a missing account as no balance without reading events', async () => {
    const r = reader(); r.account = () => result(null);
    expect(await readLoyaltySnapshot(r, 's', 'c', () => true)).toMatchObject({ account: null, events: [] }); expect(r.events).not.toHaveBeenCalled();
  });
  it.each(['program', 'account', 'events'] as const)('propagates %s errors, never a partial result', async key => {
    const r = reader(); r[key] = () => result(null, new Error('denied'));
    await expect(readLoyaltySnapshot(r, 's', 'c', () => true)).rejects.toThrow('denied');
  });
  it.each(['program', 'account', 'events'] as const)('discards results invalidated during %s', async key => {
    let active = true; const r = reader(); const original = r[key];
    r[key] = async () => { active = false; return original('a'); };
    expect(await readLoyaltySnapshot(r, 's', 'c', () => active)).toBeNull();
    if (key === 'program') expect(r.account).not.toHaveBeenCalled();
    if (key !== 'events') expect(r.events).not.toHaveBeenCalled();
  });
  it('does not start a read in an invalid context', async () => { const r = reader(); expect(await readLoyaltySnapshot(r, 's', 'c', () => false)).toBeNull(); expect(r.program).not.toHaveBeenCalled(); });
  it.each([
    ['program', { ...program, salon_id: 'other' }], ['program', { ...program, points_per_euro: null }],
    ['program', { ...program, reward_threshold: 0 }], ['account', { ...account, client_id: 'other' }],
    ['account', { ...account, points_balance: 'NaN' }], ['events', null],
    ['events', [event, event]], ['events', [{ ...event, loyalty_account_id: 'other' }]],
    ['events', [{ ...event, points_delta: 0 }]], ['events', [{ ...event, created_at: 'bad' }]],
  ] as const)('rejects malformed or mismatched %s data', async (key, data) => {
    const r = reader(); r[key] = () => result(data);
    await expect(readLoyaltySnapshot(r, 's', 'c', () => true)).rejects.toThrow();
  });
  it('an older same-client refresh cannot finish over a newer one', async () => {
    const scope = createLatestRequestScope(); scope.setContext('s/c');
    let release!: (value: { data: unknown; error: unknown }) => void;
    const r = reader(); r.program = () => new Promise(resolve => { release = resolve; });
    const old = readLoyaltySnapshot(r, 's', 'c', scope.begin('s/c')!);
    const fresh = await readLoyaltySnapshot(reader(), 's', 'c', scope.begin('s/c')!);
    release({ data: program, error: null }); expect(await old).toBeNull(); expect(fresh?.account?.id).toBe('a'); expect(r.account).not.toHaveBeenCalled();
  });
});
