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

const emptyPermissions: Permissions = {
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

export const usePermissions = () => {
  const { user } = useAuth();

  const { data: permissions, isLoading } = useQuery<Permissions>({
    queryKey: ['permissions', user?.id],
    queryFn: async () => {
      if (!user) return emptyPermissions;

      // A legacy account can contain more than one role row. Mirror the database
      // resolver: prefer an admin membership, otherwise the oldest membership.
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('role, salon_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (roleError) {
        console.error('[Permissions] role lookup failed:', roleError);
        return emptyPermissions;
      }

      const memberships = roleRows || [];
      const selectedMembership =
        memberships.find((membership: any) => membership.role === 'admin') ||
        memberships[0] ||
        null;

      const role = (selectedMembership?.role ?? null) as UserRole;
      const salonId = selectedMembership?.salon_id ?? null;
      const isAdmin = role === 'admin';

      let employeeId: string | null = null;

      if (salonId) {
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .eq('salon_id', salonId)
          .eq('is_active', true)
          .maybeSingle();

        if (employeeError) {
          console.error('[Permissions] employee lookup failed:', employeeError);
        } else {
          employeeId = employeeData?.id || null;
        }
      }

      return {
        canAccessStats: role !== null,
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
    permissions: permissions || emptyPermissions,
    isLoading,
  };
};
