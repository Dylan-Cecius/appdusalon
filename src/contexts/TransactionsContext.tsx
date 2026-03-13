import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    try {
      if (!isSupabaseConfigured) {
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
        transactionDate: toZonedTime(new Date(tx.transaction_date), 'Europe/Paris')
      })) || [];

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
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
          transactionDate: toZonedTime(new Date(), 'Europe/Paris')
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

      const currentTimeUTC = fromZonedTime(new Date(), 'Europe/Paris');
      
      // Get salon_id and employee_id for the current user
      const { data: salonIdData } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });
      const { data: employeeIdData } = await supabase.rpc('get_user_employee_id', { _user_id: user.id });
      
      if (!salonIdData) {
        toast({
          title: "Erreur",
          description: "Aucun salon associé à votre compte",
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
          user_id: user.id,
          salon_id: salonIdData,
          employee_id: employeeIdData || null,
          client_id: transaction.clientId || null,
          staff_id: transaction.staffId || null,
          transaction_date: currentTimeUTC.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction: Transaction = {
        id: (data as any).id,
        items: (data as any).items as any,
        totalAmount: (data as any).total_amount,
        paymentMethod: (data as any).payment_method as 'cash' | 'card',
        transactionDate: toZonedTime(new Date((data as any).transaction_date), 'Europe/Paris')
      };

      // Mettre à jour immédiatement l'état local
      setTransactions(prev => [newTransaction, ...prev]);

      // Auto-décrémentation du stock pour les produits correspondants
      try {
        const { data: products } = await supabase
          .from('products' as any)
          .select('id, name, current_stock, min_stock')
          .eq('salon_id', salonIdData)
          .eq('is_active', true);

        if (products && products.length > 0) {
          const lowStockAlerts: string[] = [];

          for (const item of transaction.items) {
            const matchingProduct = (products as any[]).find(
              (p: any) => p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
            );
            if (matchingProduct) {
              const qty = item.quantity || 1;
              const newStock = Math.max(0, matchingProduct.current_stock - qty);
              await supabase.from('products' as any)
                .update({ current_stock: newStock, updated_at: new Date().toISOString() } as any)
                .eq('id', matchingProduct.id);
              
              await supabase.from('stock_movements' as any).insert({
                salon_id: salonIdData,
                product_id: matchingProduct.id,
                type: 'out',
                quantity: -qty,
                previous_stock: matchingProduct.current_stock,
                new_stock: newStock,
                reason: 'Vente POS automatique',
                created_by: user.id,
              } as any);

              // Alerte stock bas
              if (newStock <= matchingProduct.min_stock) {
                lowStockAlerts.push(`${matchingProduct.name} (${newStock} restant${newStock > 1 ? 's' : ''})`);
              }
            }
          }

          if (lowStockAlerts.length > 0) {
            toast({
              title: "⚠️ Stock bas",
              description: lowStockAlerts.join(', '),
              variant: "destructive",
            });
          }
        }
      } catch (stockError) {
        console.error('Error updating stock after sale:', stockError);
      }

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

  // Delete transaction with stock restoration
  const deleteTransaction = async (id: string) => {
    try {
      if (!isSupabaseConfigured) {
        setTransactions(prev => prev.filter(tx => tx.id !== id));
        toast({
          title: "Succès",
          description: "Transaction supprimée (mode local)"
        });
        return;
      }

      // Find the transaction to restore stock
      const txToDelete = transactions.find(tx => tx.id === id);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: salonIdData } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });

      const { error } = await supabase
        .from('transactions' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Restore stock for deleted transaction items
      if (txToDelete && salonIdData) {
        try {
          const { data: products } = await supabase
            .from('products' as any)
            .select('id, name, current_stock, min_stock')
            .eq('salon_id', salonIdData)
            .eq('is_active', true);

          if (products && products.length > 0) {
            const restoredItems: string[] = [];

            for (const item of txToDelete.items) {
              const matchingProduct = (products as any[]).find(
                (p: any) => p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
              );
              if (matchingProduct) {
                const qty = item.quantity || 1;
                const newStock = matchingProduct.current_stock + qty;
                await supabase.from('products' as any)
                  .update({ current_stock: newStock, updated_at: new Date().toISOString() } as any)
                  .eq('id', matchingProduct.id);

                await supabase.from('stock_movements' as any).insert({
                  salon_id: salonIdData,
                  product_id: matchingProduct.id,
                  type: 'in',
                  quantity: qty,
                  previous_stock: matchingProduct.current_stock,
                  new_stock: newStock,
                  reason: 'Annulation encaissement — remise en stock',
                  created_by: user.id,
                } as any);

                restoredItems.push(`${matchingProduct.name} (+${qty})`);
              }
            }

            if (restoredItems.length > 0) {
              toast({
                title: "📦 Stock restauré",
                description: restoredItems.join(', '),
              });
            }
          }
        } catch (stockError) {
          console.error('Error restoring stock after deletion:', stockError);
        }
      }

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

  // Setup real-time subscription
  useEffect(() => {
    fetchTransactions();

    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('transactions-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          const newRecord = payload.new as any;
          const newTransaction: Transaction = {
            id: newRecord.id,
            items: newRecord.items,
            totalAmount: newRecord.total_amount,
            paymentMethod: newRecord.payment_method as 'cash' | 'card',
            transactionDate: toZonedTime(new Date(newRecord.transaction_date), 'Europe/Paris')
          };
          
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && newRecord.user_id === user.id) {
              setTransactions(prev => {
                // Éviter les doublons
                if (prev.some(tx => tx.id === newTransaction.id)) {
                  return prev;
                }
                return [newTransaction, ...prev];
              });
            }
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions' },
        (payload) => {
          const updatedRecord = payload.new as any;
          const updatedTransaction: Transaction = {
            id: updatedRecord.id,
            items: updatedRecord.items,
            totalAmount: updatedRecord.total_amount,
            paymentMethod: updatedRecord.payment_method as 'cash' | 'card',
            transactionDate: toZonedTime(new Date(updatedRecord.transaction_date), 'Europe/Paris')
          };
          
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && updatedRecord.user_id === user.id) {
              setTransactions(prev => 
                prev.map(tx => tx.id === updatedTransaction.id ? updatedTransaction : tx)
              );
            }
          });
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'transactions' },
        (payload) => {
          const deletedRecord = payload.old as any;
          
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && deletedRecord.user_id === user.id) {
              setTransactions(prev => prev.filter(tx => tx.id !== deletedRecord.id));
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
