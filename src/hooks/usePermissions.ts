import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'employee' | null;

export interface Permissions {
  canAccessStats: boolean;
  canAccessSettings: boolean;
  canAccessEmployeeManagement: boolean;
  canAccessReports: boolean;
  canManageTransactions: boolean;
  isAdmin: boolean;
  role: UserRole;
  salonId: string | null;
  employeeId: string | null;
}

export const usePermissions = () => {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery<Permissions>({
    queryKey: ['permissions', user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          canAccessStats: false,
          canAccessSettings: false,
          canAccessEmployeeManagement: false,
          canAccessReports: false,
          canManageTransactions: false,
          isAdmin: false,
          role: null,
          salonId: null,
          employeeId: null,
        };
      }

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, salon_id')
        .eq('user_id', user.id)
        .single();

      const role = roleData?.role as UserRole;
      const salonId = roleData?.salon_id || null;
      const isAdmin = role === 'admin';

      // Get employee_id
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      const employeeId = employeeData?.id || null;

      return {
        canAccessStats: true, // Both can access, but employees see only their stats
        canAccessSettings: isAdmin,
        canAccessEmployeeManagement: isAdmin,
        canAccessReports: isAdmin,
        canManageTransactions: isAdmin,
        isAdmin,
        role,
        salonId,
        employeeId,
      };
    },
    enabled: !!user,
  });

  return {
    permissions: permissions || {
      canAccessStats: false,
      canAccessSettings: false,
      canAccessEmployeeManagement: false,
      canAccessReports: false,
      canManageTransactions: false,
      isAdmin: false,
      role: null,
      salonId: null,
      employeeId: null,
    },
    isLoading,
  };
};
