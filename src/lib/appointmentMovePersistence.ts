import type { SupabaseClient } from '@supabase/supabase-js';
import type { Appointment } from '@/data/appointments';

export async function persistAppointmentMove(client: SupabaseClient, salonId: string, original: Appointment, candidate: Appointment, isCurrent: () => boolean) {
  if (!isCurrent() || !salonId || !original.updatedAt) throw new Error('Actualisez l’agenda avant de déplacer ce rendez-vous.');
  const duration = original.endTime.getTime() - original.startTime.getTime();
  if (candidate.id !== original.id || !candidate.staffId || !['scheduled', 'pending_payment'].includes(original.status)
    || !Number.isFinite(candidate.startTime.getTime()) || !Number.isFinite(duration) || duration <= 0
    || candidate.endTime.getTime() - candidate.startTime.getTime() !== duration) {
    throw new Error('Le déplacement doit conserver le rendez-vous et sa durée.');
  }
  const { data, error } = await client.from('appointments')
    .update({ start_time: candidate.startTime.toISOString(), end_time: candidate.endTime.toISOString(), staff_id: candidate.staffId })
    .eq('id', original.id).eq('salon_id', salonId).eq('updated_at', original.updatedAt)
    .in('status', ['scheduled', 'pending_payment']).select('id').maybeSingle();
  if (error) throw error;
  if (!isCurrent()) throw new Error('Le contexte de session a changé.');
  if (data?.id !== original.id) throw new Error('Déplacement non confirmé. Vérifiez l’agenda avant de réessayer.');
}
