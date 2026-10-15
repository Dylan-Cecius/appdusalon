import { runExclusiveAction } from './exclusiveAction';

export type ClientEditFields = { name: string; phone: string; email?: string; notes?: string };
export class ClientEditError extends Error {}

/** Only fields editable in this form; never send ownership, IDs or stale timestamps. */
export function clientEditPatch(draft: ClientEditFields, canUseNotes: boolean): ClientEditFields {
  const name = draft.name.trim(), phone = draft.phone.trim();
  if (!name || !phone) throw new ClientEditError('Le nom et le téléphone sont requis.');
  return { name, phone, email: draft.email?.trim() || '', ...(canUseNotes ? { notes: draft.notes || '' } : {}) };
}

export function saveClientEdit<T extends { id: string }>(lock: { current: boolean }, options: {
  id: string;
  draft: ClientEditFields;
  canUseNotes: boolean;
  update: (id: string, patch: ClientEditFields) => Promise<T | null | undefined>;
  confirmed: (client: T) => void;
}): Promise<boolean> {
  return runExclusiveAction(lock, async () => {
    if (!options.id) throw new Error('client_update_missing_id');
    const result = await options.update(options.id, clientEditPatch(options.draft, options.canUseNotes));
    if (result?.id !== options.id) throw new Error('client_update_unconfirmed');
    options.confirmed(result);
  });
}
