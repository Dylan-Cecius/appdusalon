export type LoyaltyProgram = {
  salon_id: string; enabled: boolean; points_per_euro: number;
  reward_threshold: number; reward_value: number; birthday_bonus: number;
};
export type LoyaltyAccount = {
  id: string; salon_id: string; client_id: string;
  points_balance: number; lifetime_earned: number; lifetime_redeemed: number;
};
export type LoyaltyEvent = {
  id: string; event_type: 'earn' | 'redeem' | 'adjust' | 'reversal' | 'birthday';
  points_delta: number; monetary_value: number; note: string | null; created_at: string;
};
export type LoyaltySnapshot = { program: LoyaltyProgram; account: LoyaltyAccount | null; events: LoyaltyEvent[] };
export const defaultLoyaltyProgram = (salonId: string): LoyaltyProgram => ({ salon_id: salonId, enabled: false, points_per_euro: 1, reward_threshold: 200, reward_value: 5, birthday_bonus: 0 });

type Result = { data: unknown; error: unknown };
export interface LoyaltyReader {
  program: () => PromiseLike<Result>;
  account: () => PromiseLike<Result>;
  events: (accountId: string) => PromiseLike<Result>;
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_loyalty_row');
  return value as Record<string, unknown>;
}
function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER, integer = false): number {
  const n = typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) throw new Error('invalid_loyalty_number');
  return n;
}
export function normalizeLoyaltyProgram(value: unknown, salonId: string): LoyaltyProgram {
  const r = record(value);
  if (r.salon_id !== salonId || typeof r.enabled !== 'boolean') throw new Error('invalid_loyalty_program');
  return { salon_id: salonId, enabled: r.enabled, points_per_euro: number(r.points_per_euro, 0, 100), reward_threshold: number(r.reward_threshold, 1, 1000000, true), reward_value: number(r.reward_value, 0, 99999999.99), birthday_bonus: number(r.birthday_bonus, 0, 2147483647, true) };
}
/** Publish one result only after every required read succeeds; no partial/disabled fallback on error. */
export async function readLoyaltySnapshot(reader: LoyaltyReader, salonId: string, clientId: string | undefined, current: () => boolean): Promise<LoyaltySnapshot | null> {
  const read = async (query: () => PromiseLike<Result>) => {
    if (!current()) return { stale: true as const, data: null };
    const response = await query();
    if (!current()) return { stale: true as const, data: null };
    if (response.error) throw response.error;
    return { stale: false as const, data: response.data };
  };
  const p = await read(reader.program); if (p.stale) return null;
  const program = p.data === null ? defaultLoyaltyProgram(salonId) : normalizeLoyaltyProgram(p.data, salonId);
  if (!clientId) return { program, account: null, events: [] };
  const a = await read(reader.account); if (a.stale) return null;
  if (a.data === null) return { program, account: null, events: [] };
  const row = record(a.data);
  if (typeof row.id !== 'string' || !row.id || row.salon_id !== salonId || row.client_id !== clientId) throw new Error('invalid_loyalty_account');
  const account: LoyaltyAccount = { id: row.id, salon_id: salonId, client_id: clientId, points_balance: number(row.points_balance, 0, 2147483647, true), lifetime_earned: number(row.lifetime_earned, 0, 2147483647, true), lifetime_redeemed: number(row.lifetime_redeemed, 0, 2147483647, true) };
  const e = await read(() => reader.events(account.id)); if (e.stale) return null;
  if (!Array.isArray(e.data) || e.data.length > 20) throw new Error('invalid_loyalty_events');
  const ids = new Set<string>();
  const events = e.data.map(value => {
    const r = record(value);
    if (typeof r.id !== 'string' || !r.id || ids.has(r.id) || r.salon_id !== salonId || r.client_id !== clientId || r.loyalty_account_id !== account.id || !['earn','redeem','adjust','reversal','birthday'].includes(String(r.event_type)) || typeof r.created_at !== 'string' || !Number.isFinite(Date.parse(r.created_at)) || (r.note !== null && typeof r.note !== 'string')) throw new Error('invalid_loyalty_event');
    ids.add(r.id);
    const delta = number(r.points_delta, -2147483648, 2147483647, true);
    if (!delta) throw new Error('invalid_loyalty_delta');
    return { id: r.id, event_type: r.event_type as LoyaltyEvent['event_type'], points_delta: delta, monetary_value: number(r.monetary_value, -99999999.99, 99999999.99), note: r.note as string | null, created_at: r.created_at };
  });
  return { program, account, events };
}
