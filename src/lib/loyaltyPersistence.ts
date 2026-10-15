import { normalizeLoyaltyProgram, type LoyaltyProgram } from './loyaltyRead';
export type LoyaltyFields = Omit<LoyaltyProgram, 'salon_id' | 'updated_at'>;
export type LoyaltyDraft = { enabled: boolean; points_per_euro: string; reward_threshold: string; reward_value: string; birthday_bonus: string };
export const loyaltyDraft = (p: LoyaltyProgram): LoyaltyDraft => ({ enabled: p.enabled, points_per_euro: String(p.points_per_euro), reward_threshold: String(p.reward_threshold), reward_value: String(p.reward_value), birthday_bonus: String(p.birthday_bonus) });

/** Reject rather than silently round/clamp the user's settings. Bounds match the schema. */
export function loyaltyFields(input: LoyaltyDraft | LoyaltyFields): LoyaltyFields {
  if (typeof input.enabled !== 'boolean') throw new Error('Choisissez un état valide pour le programme.');
  const parse = (key: Exclude<keyof LoyaltyFields, 'enabled'>, label: string, min: number, max: number, decimals: number) => {
    const raw = input[key];
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+(?:[.,]\d+)?$/.test(raw.trim()) ? Number(raw.trim().replace(',', '.')) : NaN;
    const scale = 10 ** decimals;
    if (!Number.isFinite(n) || n < min || n > max || Math.abs(n * scale - Math.round(n * scale)) > 0.000001) throw new Error(`${label} : indiquez une valeur entre ${min} et ${max}, avec ${decimals} décimale(s) au maximum.`);
    return n;
  };
  return { enabled: input.enabled, points_per_euro: parse('points_per_euro', 'Points par euro', 0, 100, 3), reward_threshold: parse('reward_threshold', 'Seuil de récompense', 1, 1000000, 0), reward_value: parse('reward_value', 'Valeur de la récompense', 0, 99999999.99, 2), birthday_bonus: parse('birthday_bonus', 'Bonus anniversaire', 0, 2147483647, 0) };
}
interface Mutation {
  eq: (key: string, value: string) => Mutation;
  select: () => { maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }> };
}
export interface LoyaltyWriter { from: (table: 'loyalty_programs') => {
  insert: (payload: Record<string, unknown>) => Mutation;
  update: (payload: Record<string, unknown>) => Mutation;
} }
export async function persistLoyaltyProgram(api: LoyaltyWriter, salonId: string, expectedRevision: string | null, input: LoyaltyFields, now = new Date()): Promise<LoyaltyProgram> {
  if (!salonId || !Number.isFinite(now.getTime()) || (expectedRevision !== null && !Number.isFinite(Date.parse(expectedRevision)))) throw new Error('loyalty_revision_required');
  const fields = loyaltyFields(input);
  // Existing schema has no timestamp trigger for this table. Always advance this writer's revision.
  const revision = new Date(Math.max(now.getTime(), expectedRevision ? Date.parse(expectedRevision) + 1 : 0)).toISOString();
  const table = api.from('loyalty_programs');
  const query = expectedRevision === null
    ? table.insert({ ...fields, salon_id: salonId, updated_at: revision })
    : table.update({ ...fields, updated_at: revision }).eq('salon_id', salonId).eq('updated_at', expectedRevision);
  const { data, error } = await query.select().maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('loyalty_save_not_confirmed');
  const saved = normalizeLoyaltyProgram(data, salonId);
  if (saved.updated_at === expectedRevision || Object.keys(fields).some(key => saved[key as keyof LoyaltyFields] !== fields[key as keyof LoyaltyFields])) throw new Error('loyalty_save_not_confirmed');
  return saved;
}
