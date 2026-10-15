import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { toZonedTime } from 'date-fns-tz';
import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';

import { normalizeTransaction, type Transaction, type NewTransaction } from '@/lib/transactions';
export type { Transaction } from '@/lib/transactions';
import { buildCombinedStats } from '@/lib/paymentStats';

export const useSupabaseTransactions = () => {
  const { user, isReady } = useAuth();
  const { permissions } = usePermissions();
  const salonId = permissions.salonId;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const fetchTransactions = async () => {
    console.log('[SupabaseTransactions] fetch start');
    try {
      if (!isSupabaseConfigured || !user || !salonId) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('transactions' as any)
        .select('*, transaction_payments(id, amount, method, paid_at)')
        .eq('salon_id', salonId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const formattedTransactions = (data || []).map(normalizeTransaction);

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transaction: NewTransaction) => {
    try {
      if (!isSupabaseConfigured) {
        const newTransaction: Transaction = {
          ...transaction,
          id: Date.now().toString(),
          transactionDate: toZonedTime(new Date(), 'Europe/Brussels'),
          transactionInstant: new Date().toISOString()
        };
        setTransactions(prev => [newTransaction, ...prev]);
        return newTransaction;
      }

      if (!user) {
        toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
        return;
      }

      const { data: rpcData, error } = await (supabase as any).rpc('record_pos_transaction', {
        items_param: transaction.items,
        total_amount_param: transaction.totalAmount,
        payment_method_param: transaction.paymentMethod,
        client_id_param: transaction.clientId || null,
        staff_id_param: transaction.staffId || null,
      });

      if (error) throw error;

      const data = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!data) throw new Error('Transaction non créée');

      const newTransaction = normalizeTransaction(data);

      setTransactions(prev => [newTransaction, ...prev]);

      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer la transaction", variant: "destructive" });
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      if (!isSupabaseConfigured) {
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        toast({ title: "Succès", description: "Transaction supprimée (mode local)", duration: 2000 });
        return;
      }

      const { error } = await (supabase as any).rpc('delete_pos_transaction', {
        transaction_id_param: id,
      });

      if (error) throw error;

      setTransactions(prev => prev.filter(tx => tx.id !== id));
      toast({ title: "Succès", description: "Transaction supprimée avec succès", duration: 2000 });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({ title: "Erreur", description: "Impossible de supprimer la transaction", variant: "destructive" });
    }
  };

  const getStats = () => buildCombinedStats(transactions);

  const getCustomStats = (startDate: Date, endDate: Date) => {
    const rangeTransactions = transactions.filter(tx => 
      tx.transactionDate >= startDate && tx.transactionDate <= endDate
    );

    return {
      totalRevenue: rangeTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0),
      totalClients: rangeTransactions.length,
      transactions: rangeTransactions
    };
  };

  // Gate on auth readiness
  useEffect(() => {
    if (!isReady) return;

    if (!user || !salonId) {
      setTransactions([]);
      setLoading(false);
      userIdRef.current = null;
      return;
    }

    if (userIdRef.current === user.id) return;
    userIdRef.current = user.id;

    setLoading(true);
    fetchTransactions();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`transactions-hook-realtime-${salonId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'transactions', filter: `salon_id=eq.${salonId}` },
        () => { void fetchTransactions(); }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `salon_id=eq.${salonId}` },
        () => { void fetchTransactions(); }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'transactions', filter: `salon_id=eq.${salonId}` },
        () => { void fetchTransactions(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady, user?.id, salonId]);

  return {
    transactions, loading, addTransaction, deleteTransaction,
    getStats, getCustomStats, refreshTransactions: fetchTransactions
  };
};
