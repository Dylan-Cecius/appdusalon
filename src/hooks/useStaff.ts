import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Staff {
  id: string;
  salon_id: string;
  name: string;
  role: string;
  color: string;
  phone: string | null;
  email: string | null;
  commission_rate: number;
  is_active: boolean;
  start_time: string;
  end_time: string;
  working_days: string[];
  created_at: string;
}

export const useStaff = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('staff' as any)
        .select('*')
        .order('name');
      if (error) throw error;
      return (data as any[]).map((s: any) => ({
        ...s,
        start_time: s.start_time || '09:00',
        end_time: s.end_time || '19:00',
        working_days: s.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      })) as Staff[];
    },
    enabled: !!user,
  });

  const createStaff = useMutation({
    mutationFn: async (staffData: Omit<Staff, 'id' | 'salon_id' | 'created_at'>) => {
      const { data: salonId } = await supabase.rpc('get_user_salon_id', { _user_id: user!.id });
      if (!salonId) throw new Error('Salon introuvable');

      const { error } = await supabase
        .from('staff' as any)
        .insert({ ...staffData, salon_id: salonId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Membre ajouté avec succès');
    },
    onError: (error: any) => toast.error(error.message || 'Erreur lors de l\'ajout'),
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Staff> }) => {
      const { error } = await supabase
        .from('staff' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Membre mis à jour');
    },
    onError: (error: any) => toast.error(error.message || 'Erreur lors de la mise à jour'),
  });

  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Membre supprimé');
    },
    onError: (error: any) => toast.error(error.message || 'Erreur lors de la suppression'),
  });

  const activeStaff = staff.filter(s => s.is_active);

  return { staff, activeStaff, isLoading, createStaff, updateStaff, deleteStaff };
};
