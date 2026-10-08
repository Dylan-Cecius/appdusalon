import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { toZonedTime } from 'date-fns-tz';
import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';

export interface Transaction {
  id: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    kind?: 'service' | 'product';
    type?: 'service' | 'product';
  }>;
  totalAmount: number;
  paymentMethod: 'cash' | 'card';
  transactionDate: Date;
  clientId?: string;
  staffId?: string;
}

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
        .select('*')
        .eq('salon_id', salonId)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const formattedTransactions = data?.map((tx: any) => ({
        id: tx.id,
        items: tx.items as any,
        totalAmount: tx.total_amount,
        paymentMethod: tx.payment_method as 'cash' | 'card',
        transactionDate: toZonedTime(new Date(tx.transaction_date), 'Europe/Brussels'),
        clientId: tx.client_id || undefined,
        staffId: tx.staff_id || undefined
      })) || [];

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'transactionDate'>) => {
    try {
      if (!isSupabaseConfigured) {
        const newTransaction: Transaction = {
          ...transaction,
          id: Date.now().toString(),
          transactionDate: toZonedTime(new Date(), 'Europe/Brussels')
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

      const newTransaction: Transaction = {
        id: data.id,
        items: data.items as Transaction['items'],
        totalAmount: Number(data.total_amount),
        paymentMethod: data.payment_method as 'cash' | 'card',
        transactionDate: toZonedTime(new Date(data.transaction_date), 'Europe/Brussels'),
        clientId: data.client_id || undefined,
        staffId: data.staff_id || undefined,
      };

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

  const getStats = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const todayTransactions = transactions.filter(tx => tx.transactionDate >= startOfToday);
    const weekTransactions = transactions.filter(tx => tx.transactionDate >= startOfWeek);
    const monthTransactions = transactions.filter(tx => tx.transactionDate >= startOfMonth);

    const todayRevenue = todayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const todayClients = todayTransactions.length;
    const weeklyRevenue = weekTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const weeklyClients = weekTransactions.length;
    const monthlyRevenue = monthTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const monthlyClients = monthTransactions.length;

    const todayCash = todayTransactions.filter(tx => tx.paymentMethod === 'cash').length;
    const todayCard = todayTransactions.filter(tx => tx.paymentMethod === 'card').length;
    const weeklyCash = weekTransactions.filter(tx => tx.paymentMethod === 'cash').length;
    const weeklyCard = weekTransactions.filter(tx => tx.paymentMethod === 'card').length;
    const monthlyCash = monthTransactions.filter(tx => tx.paymentMethod === 'cash').length;
    const monthlyCard = monthTransactions.filter(tx => tx.paymentMethod === 'card').length;

    const todayCashPercent = todayClients > 0 ? (todayCash / todayClients) * 100 : 0;
    const todayCardPercent = todayClients > 0 ? (todayCard / todayClients) * 100 : 0;
    const weeklyCashPercent = weeklyClients > 0 ? (weeklyCash / weeklyClients) * 100 : 0;
    const weeklyCardPercent = weeklyClients > 0 ? (weeklyCard / weeklyClients) * 100 : 0;
    const monthlyCashPercent = monthlyClients > 0 ? (monthlyCash / monthlyClients) * 100 : 0;
    const monthlyCardPercent = monthlyClients > 0 ? (monthlyCard / monthlyClients) * 100 : 0;

    return {
      todayRevenue, todayClients, weeklyRevenue, weeklyClients, monthlyRevenue, monthlyClients,
      paymentStats: {
        today: { cash: todayCash, card: todayCard, cashPercent: todayCashPercent, cardPercent: todayCardPercent },
        weekly: { cash: weeklyCash, card: weeklyCard, cashPercent: weeklyCashPercent, cardPercent: weeklyCardPercent },
        monthly: { cash: monthlyCash, card: monthlyCard, cashPercent: monthlyCashPercent, cardPercent: monthlyCardPercent }
      }
    };
  };

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
        (payload) => {
          const newRecord = payload.new as any;
          const newTransaction: Transaction = {
            id: newRecord.id,
            items: newRecord.items,
            totalAmount: newRecord.total_amount,
            paymentMethod: newRecord.payment_method as 'cash' | 'card',
            transactionDate: toZonedTime(new Date(newRecord.transaction_date), 'Europe/Brussels')
          };
          setTransactions(prev => {
            if (prev.some(tx => tx.id === newTransaction.id)) return prev;
            return [newTransaction, ...prev];
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `salon_id=eq.${salonId}` },
        (payload) => {
          const updatedRecord = payload.new as any;
          const updatedTransaction: Transaction = {
            id: updatedRecord.id,
            items: updatedRecord.items,
            totalAmount: updatedRecord.total_amount,
            paymentMethod: updatedRecord.payment_method as 'cash' | 'card',
            transactionDate: toZonedTime(new Date(updatedRecord.transaction_date), 'Europe/Brussels')
          };
          setTransactions(prev => 
            prev.map(tx => tx.id === updatedTransaction.id ? updatedTransaction : tx)
          );
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'transactions', filter: `salon_id=eq.${salonId}` },
        (payload) => {
          const deletedRecord = payload.old as any;
          setTransactions(prev => prev.filter(tx => tx.id !== deletedRecord.id));
        }
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
