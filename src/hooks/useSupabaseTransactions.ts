import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const formattedTransactions = data.map(tx => ({
        id: tx.id,
        items: tx.items,
        totalAmount: parseFloat(tx.total_amount),
        paymentMethod: tx.payment_method,
        transactionDate: new Date(tx.transaction_date)
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new transaction
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'transactionDate'>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          items: transaction.items,
          total_amount: transaction.totalAmount,
          payment_method: transaction.paymentMethod
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction: Transaction = {
        id: data.id,
        items: data.items,
        totalAmount: parseFloat(data.total_amount),
        paymentMethod: data.payment_method,
        transactionDate: new Date(data.transaction_date)
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

  // Get stats from transactions
  const getStats = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayTransactions = transactions.filter(tx => 
      tx.transactionDate >= startOfToday
    );

    const monthTransactions = transactions.filter(tx => 
      tx.transactionDate >= startOfMonth
    );

    const todayRevenue = todayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const todayClients = todayTransactions.length;
    const monthlyRevenue = monthTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const monthlyClients = monthTransactions.length;

    return {
      todayRevenue,
      todayClients,
      monthlyRevenue,
      monthlyClients
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
    getStats,
    refreshTransactions: fetchTransactions
  };
};