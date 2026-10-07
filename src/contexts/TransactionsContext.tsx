import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { toZonedTime } from 'date-fns-tz';
import { useAuth } from '@/hooks/useAuth';

export interface Transaction {
  id: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    kind?: 'service' | 'product';
  }>;
  totalAmount: number;
  paymentMethod: 'cash' | 'card';
  transactionDate: Date;
  clientId?: string;
  staffId?: string;
}

interface TransactionsContextType {
  transactions: Transaction[];
  loading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'transactionDate'>) => Promise<Transaction | undefined>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider = ({ children }: { children: ReactNode }) => {
  const { user, isReady } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    console.log('[Transactions] fetch start', { userId: user?.id });
    try {
      if (!isSupabaseConfigured || !user) {
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
        transactionDate: toZonedTime(new Date(tx.transaction_date), 'Europe/Brussels'),
        clientId: tx.client_id || undefined,
        staffId: tx.staff_id || undefined
      })) || [];

      console.log('[Transactions] fetch success', formattedTransactions.length, 'transactions');
      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('[Transactions] fetch error:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new transaction
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
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive"
        });
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

      const { data: lowStockProducts } = await supabase
        .from('products' as any)
        .select('id, name, current_stock, min_stock')
        .in(
          'id',
          transaction.items
            .filter(item => item.kind === 'product')
            .map(item => item.id)
        );

      const alerts = (lowStockProducts || [])
        .filter((product: any) => product.current_stock <= product.min_stock)
        .map((product: any) =>
          `${product.name} (${product.current_stock} restant${product.current_stock > 1 ? 's' : ''})`
        );

      if (alerts.length > 0) {
        toast({
          title: "⚠️ Stock bas",
          description: alerts.join(', '),
          variant: "destructive",
        });
      }

      const { data: salonIdData } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });

      // Log activity
      try {
        const clientName = transaction.items?.map(i => i.name).join(', ') || '';
        await supabase.from('activity_logs' as any).insert({
          salon_id: salonIdData,
          user_id: user.id,
          user_email: user.email || '',
          action: 'TRANSACTION_CREATED',
          details: { amount: transaction.totalAmount, items: clientName },
        });
      } catch (logError) {
        console.error('Error logging transaction activity:', logError);
      }
      
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
        setTransactions(prev => 
          prev.map(tx => tx.id === id ? { ...tx, ...updates } : tx)
        );
        toast({
          title: "Succès",
          description: "Transaction modifiée (mode local)",
          duration: 2000
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
        description: "Transaction modifiée avec succès",
        duration: 2000
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

  // Delete transaction with atomic stock restoration
  const deleteTransaction = async (id: string) => {
    try {
      if (!isSupabaseConfigured) {
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        toast({
          title: "Succès",
          description: "Transaction supprimée (mode local)",
          duration: 2000
        });
        return;
      }

      if (!user) return;

      const { error } = await (supabase as any).rpc('delete_pos_transaction', {
        transaction_id_param: id,
      });

      if (error) throw error;

      setTransactions(prev => prev.filter(tx => tx.id !== id));

      toast({
        title: "Succès",
        description: "Transaction supprimée et stock restauré",
        duration: 2000
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

  // Gate fetching on auth readiness + user
  useEffect(() => {
    if (!isReady) {
      console.log('[Transactions] effect: auth not ready yet');
      return;
    }

    if (!user) {
      console.log('[Transactions] effect: no user — clearing state');
      setTransactions([]);
      setLoading(false);
      userIdRef.current = null;
      return;
    }

    // Avoid duplicate fetch if user hasn't changed
    if (userIdRef.current === user.id) {
      return;
    }
    userIdRef.current = user.id;

    console.log('[Transactions] effect trigger — fetching for user', user.id);
    setLoading(true);
    fetchTransactions();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          const newRecord = payload.new as any;
          if (newRecord.user_id !== user.id) return;
          const newTransaction: Transaction = {
            id: newRecord.id,
            items: newRecord.items,
            totalAmount: newRecord.total_amount,
            paymentMethod: newRecord.payment_method as 'cash' | 'card',
            transactionDate: toZonedTime(new Date(newRecord.transaction_date), 'Europe/Brussels'),
            clientId: newRecord.client_id || undefined,
            staffId: newRecord.staff_id || undefined
          };
          setTransactions(prev => {
            if (prev.some(tx => tx.id === newTransaction.id)) return prev;
            return [newTransaction, ...prev];
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions' },
        (payload) => {
          const updatedRecord = payload.new as any;
          if (updatedRecord.user_id !== user.id) return;
          const updatedTransaction: Transaction = {
            id: updatedRecord.id,
            items: updatedRecord.items,
            totalAmount: updatedRecord.total_amount,
            paymentMethod: updatedRecord.payment_method as 'cash' | 'card',
            transactionDate: toZonedTime(new Date(updatedRecord.transaction_date), 'Europe/Brussels'),
            clientId: updatedRecord.client_id || undefined,
            staffId: updatedRecord.staff_id || undefined
          };
          setTransactions(prev => 
            prev.map(tx => tx.id === updatedTransaction.id ? updatedTransaction : tx)
          );
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'transactions' },
        (payload) => {
          const deletedRecord = payload.old as any;
          if (deletedRecord.user_id !== user.id) return;
          setTransactions(prev => prev.filter(tx => tx.id !== deletedRecord.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady, user?.id]);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        loading,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        refreshTransactions: fetchTransactions
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (context === undefined) {
    throw new Error('useTransactions must be used within a TransactionsProvider');
  }
  return context;
};
