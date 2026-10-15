import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { readLoyaltySnapshot, type LoyaltyProgram } from '@/lib/loyaltyRead';
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
  const saveProgram = async (
    updates: Omit<LoyaltyProgram, 'salon_id'>
  ) => {
    if (!salonId) throw new Error('salon_not_found');

    const payload = {
      salon_id: salonId,
      enabled: Boolean(updates.enabled),
      points_per_euro: Math.max(0, Number(updates.points_per_euro || 0)),
      reward_threshold: Math.max(1, Math.round(Number(updates.reward_threshold || 1))),
      reward_value: Math.max(0, Number(updates.reward_value || 0)),
      birthday_bonus: Math.max(0, Math.round(Number(updates.birthday_bonus || 0))),
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from('loyalty_programs')
      .upsert(payload, { onConflict: 'salon_id' });

    if (error) throw error;

    toast({
      title: 'Programme fidélité mis à jour',
      description: payload.enabled
        ? 'Les prochains encaissements liés à un client généreront des points.'
        : 'Le gain automatique de points est désactivé.',
    });

    await refresh();
  };

  return {
    program: data?.program ?? null, account: data?.account ?? null, events: data?.events ?? [],
    loading: !isReady || loading, error, refresh, saveProgram, contextKey, captureContext,
  };
};
