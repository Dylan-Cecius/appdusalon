import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ActivityAction =
  | 'CLIENT_CREATED'
  | 'CLIENT_DELETED'
  | 'EXPORT_RGPD'
  | 'TRANSACTION_CREATED'
  | 'LOGIN';

export interface ActivityLog {
  id: string;
  salon_id: string;
  user_id: string;
  user_email: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

export const useActivityLog = () => {
  const { user } = useAuth();

  const logActivity = useCallback(async (action: ActivityAction, details: Record<string, any> = {}) => {
    if (!user) return;

    try {
      const { data: salonId } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });
      if (!salonId) return;

      await supabase.from('activity_logs' as any).insert({
        salon_id: salonId,
        user_id: user.id,
        user_email: user.email || '',
        action,
        details,
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [user]);

  return { logActivity };
};
