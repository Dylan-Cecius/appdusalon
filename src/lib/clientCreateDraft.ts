export type ClientCreateDraft = { name: string; phone: string; email: string; birth_date: string; notes: string };
export type ClientCreateInput = { name: string; phone: string; email?: string; birth_date?: string; notes: string };

export class ClientDraftError extends Error {}

export function clientCreateInput(draft: ClientCreateDraft, canUseNotes: boolean): ClientCreateInput {
  const name = draft.name.trim(), phone = draft.phone.trim();
  if (!name || !phone) throw new ClientDraftError('Le nom et le téléphone sont requis.');
  return {
    name, phone,
    email: draft.email.trim() || undefined,
    // PostgreSQL DATE cannot accept an empty string; absent optional fields are omitted.
    birth_date: draft.birth_date || undefined,
    notes: canUseNotes ? draft.notes : '',
  };
}
