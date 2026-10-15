import type { SupabaseClient } from '@supabase/supabase-js';
import type { Appointment } from '@/data/appointments';

export type AppointmentContactUpdates = Partial<Pick<Appointment, 'clientName' | 'clientPhone' | 'notes'>>;

export class AppointmentContactError extends Error {}

export function appointmentContactPatch(updates: AppointmentContactUpdates) {
  const patch: { client_name?: string; client_phone?: string; notes?: string } = {};
  if (updates.clientName !== undefined) {
    if (!updates.clientName.trim()) throw new AppointmentContactError('Le nom du client est requis.');
    patch.client_name = updates.clientName.trim();
  }
  // Empty strings are intentional clears, not absent fields.
  if (updates.clientPhone !== undefined) patch.client_phone = updates.clientPhone.trim();
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (!Object.keys(patch).length) throw new AppointmentContactError('Aucune modification à enregistrer.');
  return patch;
}

export async function persistAppointmentContactUpdate(
  client: SupabaseClient,
  salonId: string,
  original: Appointment,
  updates: AppointmentContactUpdates,
): Promise<AppointmentContactUpdates & { updatedAt: string }> {
  if (!salonId || !original.updatedAt) {
    throw new AppointmentContactError('Actualisez l’agenda et rouvrez la fiche avant de modifier ce rendez-vous.');
  }
  const { data, error } = await client.from('appointments')
    .update(appointmentContactPatch(updates))
    .eq('id', original.id).eq('salon_id', salonId).eq('updated_at', original.updatedAt)
    .in('status', ['scheduled', 'pending_payment'])
    .select('client_name,client_phone,notes,updated_at').maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new AppointmentContactError('Ce rendez-vous a changé ou n’est plus accessible. Copiez vos saisies, actualisez l’agenda et rouvrez la fiche.');
  }
  return { clientName: data.client_name, clientPhone: data.client_phone || '', notes: data.notes || '', updatedAt: data.updated_at };
}
