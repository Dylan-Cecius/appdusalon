import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';

export type LoyaltyProgram = {
  salon_id: string;
  enabled: boolean;
  points_per_euro: number;
  reward_threshold: number;
  reward_value: number;
  birthday_bonus: number;
};

export type LoyaltyAccount = {
  id: string;
  salon_id: string;
  client_id: string;
  points_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
};

export type LoyaltyEvent = {
  id: string;
  event_type: 'earn' | 'redeem' | 'adjust' | 'reversal' | 'birthday';
  points_delta: number;
  monetary_value: number;
  note: string | null;
  created_at: string;
};

const defaultProgram = (salonId: string): LoyaltyProgram => ({
  salon_id: salonId,
  enabled: false,
  points_per_euro: 1,
  reward_threshold: 200,
  reward_value: 5,
  birthday_bonus: 0,
});

export const useLoyalty = (clientId?: string) => {
  const { permissions } = usePermissions();
  const salonId = permissions.salonId;

  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [events, setEvents] = useState<LoyaltyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!salonId) {
      setProgram(null);
      setAccount(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: programData, error: programError } = await (supabase as any)
        .from('loyalty_programs')
        .select('*')
        .eq('salon_id', salonId)
        .maybeSingle();

      if (programError) throw programError;

      const resolvedProgram = programData
        ? {
            ...programData,
            points_per_euro: Number(programData.points_per_euro || 0),
            reward_threshold: Number(programData.reward_threshold || 200),
            reward_value: Number(programData.reward_value || 0),
            birthday_bonus: Number(programData.birthday_bonus || 0),
          }
        : defaultProgram(salonId);

      setProgram(resolvedProgram);

      if (!clientId) {
        setAccount(null);
        setEvents([]);
        return;
      }

      const { data: accountData, error: accountError } = await (supabase as any)
        .from('client_loyalty_accounts')
        .select('*')
        .eq('salon_id', salonId)
        .eq('client_id', clientId)
        .maybeSingle();

      if (accountError) throw accountError;

      const resolvedAccount = accountData
        ? {
            ...accountData,
            points_balance: Number(accountData.points_balance || 0),
            lifetime_earned: Number(accountData.lifetime_earned || 0),
            lifetime_redeemed: Number(accountData.lifetime_redeemed || 0),
          }
        : null;

      setAccount(resolvedAccount);

      if (resolvedAccount?.id) {
        const { data: eventData, error: eventError } = await (supabase as any)
          .from('loyalty_events')
          .select('id,event_type,points_delta,monetary_value,note,created_at')
          .eq('loyalty_account_id', resolvedAccount.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (eventError) throw eventError;

        setEvents(
          (eventData || []).map((event: any) => ({
            ...event,
            points_delta: Number(event.points_delta || 0),
            monetary_value: Number(event.monetary_value || 0),
          }))
        );
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('[Loyalty] refresh failed', error);
      setProgram(salonId ? defaultProgram(salonId) : null);
      setAccount(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [salonId, clientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    program,
    account,
    events,
    loading,
    refresh,
    saveProgram,
  };
};
