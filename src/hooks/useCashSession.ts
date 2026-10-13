import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';

export type CashSession = {
  id: string;
  salon_id: string;
  opened_by_user_id: string;
  opened_at: string;
  opening_float: number;
  status: 'open' | 'closed';
  counted_cash: number | null;
  theoretical_cash: number | null;
  cash_difference: number | null;
  notes: string | null;
};

export type CashMovement = {
  id: string;
  cash_session_id: string;
  movement_type: 'deposit' | 'withdrawal';
  amount: number;
  reason: string | null;
  created_at: string;
};

export const useCashSession = () => {
  const { permissions } = usePermissions();
  const salonId = permissions.salonId;
  const [session, setSession] = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!salonId) {
      setSession(null);
      setMovements([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await (supabase as any)
        .from('cash_sessions')
        .select('*')
        .eq('salon_id', salonId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) throw sessionError;

      const current = (sessionData || null) as CashSession | null;
      setSession(current);

      if (current?.id) {
        const { data: movementData, error: movementError } = await (supabase as any)
          .from('cash_movements')
          .select('id,cash_session_id,movement_type,amount,reason,created_at')
          .eq('cash_session_id', current.id)
          .order('created_at', { ascending: true });

        if (movementError) throw movementError;
        setMovements((movementData || []) as CashMovement[]);
      } else {
        setMovements([]);
      }
    } catch (error) {
      console.error('[CashSession] refresh failed', error);
      setSession(null);
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openSession = async (openingFloat: number, notes = '') => {
    const { error } = await (supabase as any).rpc('open_cash_session', {
      opening_float_param: openingFloat,
      notes_param: notes || null,
    });

    if (error) throw error;

    toast({
      title: 'Caisse ouverte',
      description: `Fond de caisse : ${openingFloat.toFixed(2)} €`,
    });

    await refresh();
  };

  const recordMovement = async (
    type: 'deposit' | 'withdrawal',
    amount: number,
    reason = ''
  ) => {
    const { error } = await (supabase as any).rpc('record_cash_movement', {
      movement_type_param: type,
      amount_param: amount,
      reason_param: reason || null,
    });

    if (error) throw error;

    toast({
      title: type === 'deposit' ? 'Dépôt enregistré' : 'Retrait enregistré',
      description: `${amount.toFixed(2)} €`,
    });

    await refresh();
  };

  const closeSession = async (countedCash: number, notes = '') => {
    const { data, error } = await (supabase as any).rpc('close_cash_session', {
      counted_cash_param: countedCash,
      notes_param: notes || null,
    });

    if (error) throw error;

    const result = data as {
      theoretical_cash?: number;
      counted_cash?: number;
      cash_difference?: number;
      total_sales?: number;
      transaction_count?: number;
      cash_sales?: number;
      card_sales?: number;
      mixed_sales?: number;
    };

    setSession(null);
    setMovements([]);

    toast({
      title: 'Caisse clôturée',
      description: `Écart : ${Number(result?.cash_difference || 0).toFixed(2)} €`,
      variant:
        Math.abs(Number(result?.cash_difference || 0)) > 0.009
          ? 'destructive'
          : 'default',
    });

    return result;
  };

  const movementTotals = useMemo(() => {
    let deposits = 0;
    let withdrawals = 0;

    movements.forEach((movement) => {
      if (movement.movement_type === 'deposit') deposits += Number(movement.amount || 0);
      if (movement.movement_type === 'withdrawal') withdrawals += Number(movement.amount || 0);
    });

    return { deposits, withdrawals, net: deposits - withdrawals };
  }, [movements]);

  return {
    session,
    movements,
    movementTotals,
    loading,
    openSession,
    recordMovement,
    closeSession,
    refresh,
  };
};
