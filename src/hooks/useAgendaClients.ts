import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';
import type { RegisteredAgendaClient } from '@/lib/agendaClients';

// Only the contact fields needed by booking; client notes/loyalty stay in the full client screen.
export function useAgendaClients() {
  const { user } = useAuth();
  const userId = user?.id;
  const { permissions, isLoading: permissionsLoading } = usePermissions();
  const salonId = permissions.salonId;
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['agenda-clients', userId, salonId],
    enabled: !!userId && !!salonId && !permissionsLoading,
    queryFn: async (): Promise<RegisteredAgendaClient[]> => {
      const { data, error } = await supabase.from('clients').select('id, name, phone').eq('salon_id', salonId!).order('name');
      if (error) throw error;
      return data || [];
    },
  });
  useEffect(() => {
    if (!userId || !salonId) return;
    const channel = supabase.channel(`agenda-clients-${salonId}`).on('postgres_changes',
      { event: '*', schema: 'public', table: 'clients', filter: `salon_id=eq.${salonId}` },
      () => { void queryClient.invalidateQueries({ queryKey: ['agenda-clients', userId, salonId] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, salonId, queryClient]);
  return { clients: query.data || [], loading: permissionsLoading || (!!salonId && query.isLoading), error: query.isError };
}
