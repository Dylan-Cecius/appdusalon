import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Employee {
  id: string;
  salon_id: string;
  user_id: string;
  display_name: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useEmployees = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('display_name');

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!user,
  });

  const createEmployee = useMutation({
    mutationFn: async (employeeData: {
      email: string;
      display_name: string;
      color: string;
      role: 'admin' | 'employee';
    }) => {
      console.log('🔍 Creating employee with data:', employeeData);
      
      // Call edge function to create employee + auth account
      const { data, error } = await supabase.functions.invoke('create-employee', {
        body: employeeData,
      });

      console.log('🔍 Edge function response:', { data, error });

      if (error) {
        console.error('🔍 Edge function error:', error);
        throw error;
      }
      
      if (!data || !data.success) {
        console.error('🔍 Edge function returned error:', data);
        throw new Error(data?.error || 'Erreur lors de la création de l\'employé');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employé créé avec succès');
    },
    onError: (error: any) => {
      console.error('🔍 Create employee error:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'employé');
    },
  });

  const updateEmployee = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Employee>;
    }) => {
      const { error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employé mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour');
    },
  });

  const toggleEmployeeStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('employees')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Statut mis à jour');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour du statut');
    },
  });

  return {
    employees,
    isLoading,
    createEmployee,
    updateEmployee,
    toggleEmployeeStatus,
  };
};
