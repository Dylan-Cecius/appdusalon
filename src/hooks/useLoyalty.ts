import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { readLoyaltySnapshot } from '@/lib/loyaltyRead';
import { persistLoyaltyProgram, type LoyaltyFields, type LoyaltyWriter } from '@/lib/loyaltyPersistence';
import { useLoyaltySnapshot } from './useLoyaltySnapshot';
export type { LoyaltyProgram, LoyaltyAccount, LoyaltyEvent } from '@/lib/loyaltyRead';

interface Query extends PromiseLike<{ data: unknown; error: unknown }> {
  eq: (key: string, value: string) => Query;
  order: (key: string, options: { ascending: boolean }) => Query;
  limit: (count: number) => Query;
  maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }>;
}
interface Reader { from: (table: string) => { select: (fields: string) => Query } }
// Generated schema predates loyalty tables; narrow adapter, validated read results.
const reader = supabase as unknown as Reader;
export const useLoyalty = (clientId?: string) => {
  const { permissions } = usePermissions();
  const { user, isReady } = useAuth();
  const salonId = permissions.salonId;
  const contextKey = isReady && user && salonId ? JSON.stringify([user.id, salonId, clientId ?? null]) : null;
  const read = useCallback(async (current: () => boolean) => {
    if (!salonId) return null;
    return readLoyaltySnapshot({
      program: () => reader.from('loyalty_programs').select('*').eq('salon_id', salonId).maybeSingle(),
      account: () => reader.from('client_loyalty_accounts').select('*').eq('salon_id', salonId).eq('client_id', clientId!).maybeSingle(),
      events: accountId => reader.from('loyalty_events').select('id,salon_id,client_id,loyalty_account_id,event_type,points_delta,monetary_value,note,created_at').eq('salon_id', salonId).eq('client_id', clientId!).eq('loyalty_account_id', accountId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(20),
    }, salonId, clientId, current);
  }, [salonId, clientId]);
  const { data, error, loading, refresh, captureContext } = useLoyaltySnapshot(contextKey, read);
  const savePending = useRef(false);
  const adminRef = useRef(permissions.isAdmin);
  adminRef.current = permissions.isAdmin;
  const saveProgram = async (updates: LoyaltyFields, expectedRevision: string | null) => {
    const current = captureContext();
    if (!current() || !salonId || !adminRef.current || loading || error || !data) throw new Error('loyalty_context_unavailable');
    if (savePending.current) throw new Error('loyalty_save_pending');
    savePending.current = true;
    try {
      const saved = await persistLoyaltyProgram(supabase as unknown as LoyaltyWriter, salonId, expectedRevision, updates);
      if (!current() || !adminRef.current) throw new Error('loyalty_context_changed');
      void refresh();
      return saved;
    } finally { savePending.current = false; }
  };

  return {
    program: data?.program ?? null, account: data?.account ?? null, events: data?.events ?? [],
    loading: !isReady || loading, error, refresh, saveProgram, contextKey, canManage: permissions.isAdmin,
  };
};
