import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from './usePermissions';
import type { StaffTimeOff, TimeOffInput } from '@/lib/staffTimeOff';

function mutationError(error: { message?: string }) {
  if (error.message?.includes('time_off_appointment_conflict')) return new Error('Un rendez-vous existe sur cette période. Déplacez-le ou annulez-le avant de bloquer le créneau.');
  if (error.message?.includes('time_off_conflict')) return new Error('Une indisponibilité existe déjà sur cette période.');
  return new Error('Impossible d’enregistrer cette indisponibilité. Vérifiez votre accès et la période.');
}
export function useStaffTimeOff() {
  const { permissions } = usePermissions();
  const salonId = permissions.salonId;
  const client = useQueryClient();
  const key = ['staff-time-off', salonId];
  const query = useQuery({ queryKey: key, enabled: !!salonId, queryFn: async (): Promise<StaffTimeOff[]> => {
    const { data, error } = await supabase.from('staff_time_off').select('*').eq('salon_id', salonId!).order('starts_at');
    if (error) throw error;
    return data.map(item => ({ id: item.id, staffId: item.staff_id, title: item.title, reason: item.reason as StaffTimeOff['reason'], startTime: new Date(item.starts_at), endTime: new Date(item.ends_at) }));
  } });
  useEffect(() => {
    if (!salonId) return;
    const channel = supabase.channel(`staff-time-off-${salonId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'staff_time_off', filter: `salon_id=eq.${salonId}` }, () => { void client.invalidateQueries({ queryKey: ['staff-time-off', salonId] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [salonId, client]);
  const save = async (input: TimeOffInput, id?: string) => {
    if (!salonId || !permissions.isAdmin) throw new Error('La gestion des indisponibilités est réservée au responsable du salon.');
    const row = { salon_id: salonId, staff_id: input.staffId, title: input.title.trim(), reason: input.reason, starts_at: input.startTime.toISOString(), ends_at: input.endTime.toISOString() };
    const result = id ? await supabase.from('staff_time_off').update(row).eq('id', id).eq('salon_id', salonId).select('id').single() : await supabase.from('staff_time_off').insert(row).select('id').single();
    if (result.error) throw mutationError(result.error);
    await client.invalidateQueries({ queryKey: key });
  };
  const remove = async (id: string) => {
    if (!salonId || !permissions.isAdmin) throw new Error('Accès refusé.');
    const { error } = await supabase.from('staff_time_off').delete().eq('id', id).eq('salon_id', salonId).select('id').single();
    if (error) throw mutationError(error);
    await client.invalidateQueries({ queryKey: key });
  };
  return { entries: query.data || [], loading: query.isLoading, error: query.isError, canManage: permissions.isAdmin, save, remove };
}
