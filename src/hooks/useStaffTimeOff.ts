import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { createLatestRequestScope } from '@/lib/latestRequestScope';
import { confirmedTimeOffId } from '@/lib/timeOffMutationResult';
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
  const { user, isReady } = useAuth();
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const salonId = permissions.salonId;
  const client = useQueryClient();
  const key = ['staff-time-off', user?.id, salonId];
  const enabled = isReady && !!user && !!salonId && !permissionsLoading;
  const contextKey = enabled ? JSON.stringify([user.id, salonId, permissions.isAdmin]) : null;
  const scope = useRef(createLatestRequestScope());
  scope.current.setContext(contextKey);
  const query = useQuery({ queryKey: key, enabled, queryFn: async ({ signal }): Promise<StaffTimeOff[]> => {
    const { data, error } = await supabase.from('staff_time_off').select('*').eq('salon_id', salonId!).order('starts_at').abortSignal(signal);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('time_off_unavailable');
    return data.map(item => ({ id: item.id, staffId: item.staff_id, title: item.title, reason: item.reason as StaffTimeOff['reason'], startTime: new Date(item.starts_at), endTime: new Date(item.ends_at) }));
  } });
  useEffect(() => {
    const currentScope = scope.current;
    if (!enabled) return () => currentScope.invalidate();
    const isCurrent = currentScope.captureContext(contextKey);
    const refresh = () => { if (isCurrent()) void client.invalidateQueries({ queryKey: key }); };
    const channel = supabase.channel(`staff-time-off-${salonId}`).on('postgres_changes',
      { event: '*', schema: 'public', table: 'staff_time_off', filter: `salon_id=eq.${salonId}` }, refresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
    return () => { currentScope.invalidate(); void supabase.removeChannel(channel); };
  }, [contextKey, client]);
  const save = async (input: TimeOffInput, id?: string) => {
    const isCurrent = scope.current.captureContext(contextKey);
    if (!isCurrent() || !salonId || !permissions.isAdmin) throw new Error('La gestion des indisponibilités est réservée au responsable du salon.');
    const row = { salon_id: salonId, staff_id: input.staffId, title: input.title.trim(), reason: input.reason, starts_at: input.startTime.toISOString(), ends_at: input.endTime.toISOString() };
    const result = id ? await supabase.from('staff_time_off').update(row).eq('id', id).eq('salon_id', salonId).select('id').single() : await supabase.from('staff_time_off').insert(row).select('id').single();
    if (result.error) throw mutationError(result.error);
    if (!isCurrent()) throw new Error('Le contexte de session a changé.');
    confirmedTimeOffId(result.data, id);
    void client.invalidateQueries({ queryKey: key });
  };
  const remove = async (id: string) => {
    const isCurrent = scope.current.captureContext(contextKey);
    if (!isCurrent() || !salonId || !permissions.isAdmin) throw new Error('Accès refusé.');
    const { data, error } = await supabase.from('staff_time_off').delete().eq('id', id).eq('salon_id', salonId).select('id').single();
    if (error) throw mutationError(error);
    if (!isCurrent()) throw new Error('Le contexte de session a changé.');
    confirmedTimeOffId(data, id);
    void client.invalidateQueries({ queryKey: key });
  };
  return { entries: enabled ? query.data || [] : [], loading: !isReady || permissionsLoading || (enabled && query.isLoading), error: enabled && query.isError, canManage: enabled && permissions.isAdmin, save, remove };
}
