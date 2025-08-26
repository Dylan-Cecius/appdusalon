import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface Transaction {
  id: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  paymentMethod: 'cash' | 'card';
  transactionDate: Date;
}

export const useSupabaseTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch transactions from Supabase or use empty array
  const fetchTransactions = async () => {
    try {
      if (!isSupabaseConfigured) {
        // Use empty array when Supabase is not configured
        setTransactions([]);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('transactions' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const formattedTransactions = data?.map((tx: any) => ({
        id: tx.id,
        items: tx.items as any,
        totalAmount: tx.total_amount,
        paymentMethod: tx.payment_method as 'cash' | 'card',
        transactionDate: new Date(tx.transaction_date)
      })) || [];

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Fallback to empty array
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new transaction
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'transactionDate'>) => {
    try {
      if (!isSupabaseConfigured) {
        // Local fallback when Supabase is not configured
        const newTransaction: Transaction = {
          ...transaction,
          id: Date.now().toString(),
          transactionDate: new Date()
        };
        setTransactions(prev => [newTransaction, ...prev]);
        toast({
          title: "Succès",
          description: "Transaction enregistrée (mode local)"
        });
        return newTransaction;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('transactions' as any)
        .insert({
          items: transaction.items as any,
          total_amount: transaction.totalAmount,
          payment_method: transaction.paymentMethod,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction: Transaction = {
        id: (data as any).id,
        items: (data as any).items as any,
        totalAmount: (data as any).total_amount,
        paymentMethod: (data as any).payment_method as 'cash' | 'card',
        transactionDate: new Date((data as any).transaction_date)
      };

      setTransactions(prev => [newTransaction, ...prev]);
      
      toast({
        title: "Succès",
        description: "Transaction enregistrée avec succès"
      });

      return newTransaction;
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la transaction",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Update transaction
  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      if (!isSupabaseConfigured) {
        // Local fallback when Supabase is not configured
        setTransactions(prev => 
          prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx)
        );
        toast({
          title: "Succès",
          description: "Transaction modifiée (mode local)"
        });
        return;
      }

      const updateData: any = {};
      if (updates.items) updateData.items = updates.items as any;
      if (updates.totalAmount !== undefined) updateData.total_amount = updates.totalAmount;
      if (updates.paymentMethod) updateData.payment_method = updates.paymentMethod;

      const { error } = await supabase
        .from('transactions' as any)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev => 
        prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx)
      );

      toast({
        title: "Succès",
        description: "Transaction modifiée avec succès"
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier la transaction",
        variant: "destructive"
      });
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    try {
      if (!isSupabaseConfigured) {
        // Local fallback when Supabase is not configured
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        toast({
          title: "Succès",
          description: "Transaction supprimée (mode local)"
        });
        return;
      }

      const { error } = await supabase
        .from('transactions' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev => prev.filter(tx => tx.id !== id));
      
      toast({
        title: "Succès",
        description: "Transaction supprimée avec succès"
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la transaction",
        variant: "destructive"
      });
    }
  };
  // Get stats from transactions
  const getStats = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate week start (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const todayTransactions = transactions.filter(tx => 
      tx.transactionDate >= startOfToday
    );

    const weekTransactions = transactions.filter(tx => 
      tx.transactionDate >= startOfWeek
    );

    const monthTransactions = transactions.filter(tx => 
      tx.transactionDate >= startOfMonth
    );

    // Revenue stats
    const todayRevenue = todayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const todayClients = todayTransactions.length;
    const weeklyRevenue = weekTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const weeklyClients = weekTransactions.length;
    const monthlyRevenue = monthTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const monthlyClients = monthTransactions.length;

    // Payment method stats
    const todayCash = todayTransactions.filter(tx => tx.paymentMethod === 'cash').length;
    const todayCard = todayTransactions.filter(tx => tx.paymentMethod === 'card').length;
    const weeklyCash = weekTransactions.filter(tx => tx.paymentMethod === 'cash').length;
    const weeklyCard = weekTransactions.filter(tx => tx.paymentMethod === 'card').length;
    const monthlyCash = monthTransactions.filter(tx => tx.paymentMethod === 'cash').length;
    const monthlyCard = monthTransactions.filter(tx => tx.paymentMethod === 'card').length;

    // Calculate percentages
    const todayCashPercent = todayClients > 0 ? (todayCash / todayClients) * 100 : 0;
    const todayCardPercent = todayClients > 0 ? (todayCard / todayClients) * 100 : 0;
    const weeklyCashPercent = weeklyClients > 0 ? (weeklyCash / weeklyClients) * 100 : 0;
    const weeklyCardPercent = weeklyClients > 0 ? (weeklyCard / weeklyClients) * 100 : 0;
    const monthlyCashPercent = monthlyClients > 0 ? (monthlyCash / monthlyClients) * 100 : 0;
    const monthlyCardPercent = monthlyClients > 0 ? (monthlyCard / monthlyClients) * 100 : 0;

    return {
      todayRevenue,
      todayClients,
      weeklyRevenue,
      weeklyClients,
      monthlyRevenue,
      monthlyClients,
      // Payment method stats
      paymentStats: {
        today: {
          cash: todayCash,
          card: todayCard,
          cashPercent: todayCashPercent,
          cardPercent: todayCardPercent
        },
        weekly: {
          cash: weeklyCash,
          card: weeklyCard,
          cashPercent: weeklyCashPercent,
          cardPercent: weeklyCardPercent
        },
        monthly: {
          cash: monthlyCash,
          card: monthlyCard,
          cashPercent: monthlyCashPercent,
          cardPercent: monthlyCardPercent
        }
      }
    };
  };

  // Get stats for custom date range
  const getCustomStats = (startDate: Date, endDate: Date) => {
    const rangeTransactions = transactions.filter(tx => 
      tx.transactionDate >= startDate && tx.transactionDate <= endDate
    );

    const totalRevenue = rangeTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const totalClients = rangeTransactions.length;

    return {
      totalRevenue,
      totalClients,
      transactions: rangeTransactions
    };
  };

  useEffect(() => {
    fetchTransactions();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('transactions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    transactions,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getStats,
    getCustomStats,
    refreshTransactions: fetchTransactions
  };
};