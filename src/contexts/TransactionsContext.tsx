import { createLatestRequestScope } from '@/lib/latestRequestScope';
import { readTransactionSnapshot } from '@/lib/transactionSnapshot';
import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { toZonedTime } from 'date-fns-tz';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';

import { normalizeTransaction, type Transaction, type NewTransaction } from '@/lib/transactions';
export type { Transaction } from '@/lib/transactions';

interface TransactionsContextType {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  hasSnapshot: boolean;
  contextKey: string | null;
  addTransaction: (transaction: NewTransaction) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined);

export const TransactionsProvider = ({ children }: { children: ReactNode }) => {
  const { user, isReady } = useAuth();
  const { permissions } = usePermissions();
  const salonId = permissions.salonId;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<{ context: string; message: string } | null>(null);
  const contextKey = isReady && user && salonId ? JSON.stringify([user.id, salonId]) : null;
  const requestScope = useRef(createLatestRequestScope());
  const dataContext = useRef<string | null>(null);
  requestScope.current.setContext(contextKey);
  const hasSnapshot = !!contextKey && dataContext.current === contextKey;
  const visibleTransactions = hasSnapshot ? transactions : [];

  const fetchTransactions = useCallback(async () => {
    const isCurrent = requestScope.current.begin(contextKey);
    if (!isCurrent || !salonId) return;
    setLoading(true); setReadError(null);
    try {
      if (!isSupabaseConfigured) {
        dataContext.current = contextKey;
        return;
      }
      const result = await readTransactionSnapshot(async (from, to) => {
        const response = await supabase.from('transactions' as any)
          .select('*, transaction_payments(id, amount, method, paid_at)', { count: 'exact' })
          .eq('salon_id', salonId)
          .order('transaction_date', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);
        return { data: response.data, count: response.count, error: response.error };
      }, isCurrent);
      if (!isCurrent() || result === null) return;
      dataContext.current = contextKey;
      setTransactions(result);
    } catch (failure) {
      if (!isCurrent()) return;
      console.error('[Transactions] read failed:', failure);
      setReadError({ context: contextKey!, message: 'Impossible de charger toutes les transactions et leurs paiements. Réessayez avant d’utiliser les chiffres ou les rapports.' });
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [contextKey, salonId]);

  // Add new transaction
  const addTransaction = async (transaction: NewTransaction) => {
    const isCurrent = requestScope.current.captureContext(contextKey);
    if (!isCurrent()) throw new Error('transaction_context_changed');
    try {
      if (!isSupabaseConfigured) {
        const newTransaction: Transaction = {
          ...transaction,
          id: Date.now().toString(),
          transactionDate: toZonedTime(new Date(), 'Europe/Brussels'),
          transactionInstant: new Date().toISOString()
        };
        const belongsToContext = dataContext.current === contextKey;
        dataContext.current = contextKey;
        setTransactions(prev => [newTransaction, ...(belongsToContext ? prev : [])]);
        return newTransaction;
      }

      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive"
        });
        throw new Error('not_authenticated');
      }

      const { data: rpcData, error } = await (supabase as any).rpc('record_pos_transaction', {
        items_param: transaction.items,
        total_amount_param: transaction.totalAmount,
        payment_method_param: transaction.paymentMethod,
        client_id_param: transaction.clientId || null,
        staff_id_param: transaction.staffId || null,
      });

      if (error) throw error;
      if (!isCurrent()) throw new Error('transaction_context_changed');

      const data = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!data) throw new Error('Transaction non créée');

      const newTransaction = normalizeTransaction(data);

      if (dataContext.current === contextKey) {
        setTransactions(prev => [newTransaction, ...prev.filter(tx => tx.id !== newTransaction.id)]);
      }
      await fetchTransactions();

      // A confirmed sale must not become a retryable failure because an auxiliary read failed.
      try {
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

        if (isCurrent() && alerts.length > 0) {
          toast({
            title: "⚠️ Stock bas",
            description: alerts.join(', '),
            variant: "destructive",
          });
        }

        if (!isCurrent()) return newTransaction;
        const salonIdData = salonId;

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

      } catch (auxiliaryError) {
        console.error('Transaction saved; supplementary data unavailable:', auxiliaryError);
      }
      return newTransaction;
    } catch (error) {
      if (!isCurrent()) throw error;
      console.error('Error adding transaction:', error);

      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message || '')
            : '';

      let description = "Impossible d'enregistrer la transaction";

      if (message.includes('price_changed')) {
        description = "Un prix a changé depuis l’ajout au panier. Actualisez la caisse puis réessayez.";
      } else if (message.includes('insufficient_stock')) {
        description = "Stock insuffisant pour l’un des produits du panier.";
      } else if (
        message.includes('product_not_found') ||
        message.includes('service_not_found')
      ) {
        description = "Un article du panier n’est plus disponible.";
      } else if (message.includes('invalid_staff')) {
        description = "Le prestataire sélectionné n’est plus disponible.";
      }

      toast({
        title: "Encaissement impossible",
        description,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Delete transaction with atomic stock restoration
  const deleteTransaction = async (id: string) => {
    const isCurrent = requestScope.current.captureContext(contextKey);
    if (!isCurrent()) return;
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

      if (!isCurrent()) return;
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      await fetchTransactions();
      if (!isCurrent()) return;

      toast({
        title: "Succès",
        description: "Transaction supprimée et stock restauré",
        duration: 2000
      });
    } catch (error) {
      if (!isCurrent()) return;
      console.error('Error deleting transaction:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la transaction",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (!contextKey) {
      dataContext.current = null;
      setTransactions([]); setLoading(false); setReadError(null);
      return;
    }
    void fetchTransactions();
    if (!isSupabaseConfigured) return () => requestScope.current.invalidate();
    const channel = supabase.channel(`transactions-realtime-${salonId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `salon_id=eq.${salonId}` }, () => { void fetchTransactions(); })
      .subscribe();
    return () => {
      requestScope.current.invalidate();
      void supabase.removeChannel(channel);
    };
  }, [contextKey, salonId, fetchTransactions]);

  return (
    <TransactionsContext.Provider
      value={{
        transactions: visibleTransactions,
        loading: !isReady || loading,
        error: readError?.context === contextKey ? readError.message : null,
        hasSnapshot,
        contextKey,
        addTransaction,
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
