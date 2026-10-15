import type { Client } from './clients';
export type ClientFields = Pick<Client, 'name' | 'phone' | 'email' | 'birth_date' | 'notes'>;

/** Never copy identity, ownership, timestamps or unrecognized fields from a form. */
export function clientWriteFields(input: Partial<ClientFields>, allowNotes: boolean): Record<string, string | null> {
  const result: Record<string, string | null> = {};
  for (const key of ['name', 'phone', 'email', 'birth_date', 'notes'] as const) {
    if (key === 'notes' && !allowNotes) continue;
    if (input[key] === undefined) continue;
    if (input[key] !== null && typeof input[key] !== 'string') throw new Error('invalid_client_field');
    const value = input[key]?.trim() ?? '';
    if ((key === 'name' || key === 'phone') && !value) throw new Error('required_client_field');
    if (key === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('invalid_client_email');
    if (key === 'birth_date' && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error('invalid_client_birth_date');
    result[key] = value || null;
  }
  return result;
}

export function clientCreateFields(input: Partial<ClientFields>, allowNotes: boolean) {
  const fields = clientWriteFields(input, allowNotes);
  if (!fields.name || !fields.phone) throw new Error('required_client_field');
  return { ...fields, name: fields.name, phone: fields.phone };
}

interface ClientUpdateQuery {
  eq: (key: string, value: string) => ClientUpdateQuery;
  select: () => { maybeSingle: () => PromiseLike<{ data: Client & { salon_id?: string } | null; error: unknown }> };
}
export interface ClientWriter { from: (table: 'clients') => { update: (input: Record<string, string | null>) => ClientUpdateQuery } }
export async function persistClientEdit(api: ClientWriter, salonId: string, id: string, expectedRevision: string, input: Partial<ClientFields>, allowNotes: boolean): Promise<Client> {
  if (!salonId || !id || !expectedRevision) throw new Error('client_revision_required');
  const fields = clientWriteFields(input, allowNotes);
  if (!Object.keys(fields).length) throw new Error('empty_client_update');
  const { data, error } = await api.from('clients').update(fields).eq('id', id).eq('salon_id', salonId).eq('updated_at', expectedRevision).select().maybeSingle();
  if (error) throw error;
  if (!data || data.id !== id || data.salon_id !== salonId || !data.updated_at) throw new Error('client_update_not_confirmed');
  return data;
}
