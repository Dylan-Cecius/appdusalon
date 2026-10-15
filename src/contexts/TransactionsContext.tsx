import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { toZonedTime } from 'date-fns-tz';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { createLatestRequestScope } from '@/lib/latestRequestScope';
import { insertTransactionOnce, startTransactionFollowups } from '@/lib/transactionConfirmation';

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

interface TransactionsContextType {
  transactions: Transaction[];
  loading: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'transactionDate'>) => Promise<Transaction>;
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
  const contextKey = !isSupabaseConfigured ? 'local' : isReady && user && salonId ? JSON.stringify([user.id, salonId]) : null;
  const requestScope = useRef(createLatestRequestScope());
  const transactionsContext = useRef<string | null>(null);
  requestScope.current.setContext(contextKey);
  const visibleTransactions = transactionsContext.current === contextKey ? transactions : [];

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    const isCurrent = requestScope.current.begin(contextKey);
    if (!isCurrent) return;
    setLoading(true);
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

      if (!isCurrent()) return;
      if (error) throw error;

      const formattedTransactions = data?.map((tx: any) => ({
        id: tx.id,
        items: tx.items as any,
        totalAmount: Number(tx.total_amount),
        paymentMethod: tx.payment_method as 'cash' | 'card',
        transactionDate: toZonedTime(new Date(tx.transaction_date), 'Europe/Brussels'),
        clientId: tx.client_id || undefined,
        staffId: tx.staff_id || undefined
      })) || [];

      transactionsContext.current = contextKey;
      setTransactions(formattedTransactions);
    } catch (error) {
      if (isCurrent()) console.error('[Transactions] fetch error:', error);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  // Add new transaction
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'transactionDate'>) => {
    const isCurrentContext = requestScope.current.captureContext(contextKey);
    if (!isCurrentContext()) throw new Error('authentication_required');
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

      if (!user || !salonId) throw new Error('authentication_required');

      const { data: rpcData, error } = await (supabase as any).rpc('record_pos_transaction', {
        items_param: transaction.items,
        total_amount_param: transaction.totalAmount,
        payment_method_param: transaction.paymentMethod,
        client_id_param: transaction.clientId || null,
        staff_id_param: transaction.staffId || null,
      });

      if (error) throw error;

      const data = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (!data || typeof data.id !== 'string' || !data.id.trim()) throw new Error('Transaction non confirmée');

      const newTransaction: Transaction = {
        id: data.id,
        items: data.items as Transaction['items'],
        totalAmount: Number(data.total_amount),
        paymentMethod: data.payment_method as 'cash' | 'card',
        transactionDate: toZonedTime(new Date(data.transaction_date), 'Europe/Brussels'),
        clientId: data.client_id || undefined,
        staffId: data.staff_id || undefined,
      };

      if (!isCurrentContext()) return newTransaction;
      setTransactions(prev => insertTransactionOnce(prev, newTransaction));
      // Supersede any pre-confirmation snapshot. Failure retains the confirmed row.
      void fetchTransactions();

      // The sale is confirmed. Stock warnings and the activity journal are best effort;
      // their latency/failure must not invite the cashier to record the same sale again.
      startTransactionFollowups({
        checkStock: async () => {
          if (!isCurrentContext()) return;
          const productIds = transaction.items.filter(item => item.kind === 'product').map(item => item.id);
          if (!productIds.length) return;
          const { data: products, error: stockError } = await supabase
            .from('products' as any)
            .select('id, name, current_stock, min_stock')
            .eq('salon_id', salonId)
            .in('id', productIds);
          if (!isCurrentContext()) return;
          if (stockError) throw stockError;
          const alerts = (products || [])
            .filter((product: any) => product.current_stock <= product.min_stock)
            .map((product: any) => `${product.name} (${product.current_stock} restant${product.current_stock > 1 ? 's' : ''})`);
          if (alerts.length) toast({ title: '⚠️ Stock bas', description: alerts.join(', '), variant: 'destructive' });
        },
        logActivity: async () => {
          if (!isCurrentContext()) return;
          const { error: logError } = await supabase.from('activity_logs' as any).insert({
            salon_id: salonId,
            user_id: user.id,
            user_email: user.email || '',
            action: 'TRANSACTION_CREATED',
            details: { amount: newTransaction.totalAmount, items: newTransaction.items.map(item => item.name).join(', ') },
          });
          if (logError) throw logError;
        },
      }, (task, error) => console.error(`Transaction confirmed; ${task} failed:`, error));

      return newTransaction;
    } catch (error) {
      if (!isCurrentContext()) throw error;
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
    const isCurrentContext = requestScope.current.captureContext(contextKey);
    if (!isCurrentContext()) return;
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

      if (!isCurrentContext()) return;
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      void fetchTransactions();

      toast({
        title: "Succès",
        description: "Transaction supprimée et stock restauré",
        duration: 2000
      });
    } catch (error) {
      if (!isCurrentContext()) return;
      console.error('Error deleting transaction:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la transaction",
        variant: "destructive"
      });
    }
  };

  // The subscription and every response belong to one identity/salon generation.
  useEffect(() => {
    const scope = requestScope.current;
    transactionsContext.current = contextKey;
    setTransactions([]);
    if (!contextKey) {
      setLoading(!isReady);
      return () => scope.invalidate();
    }
    void fetchTransactions();
    if (!isSupabaseConfigured) return () => scope.invalidate();

    const isCurrentContext = scope.captureContext(contextKey);
    const channel = supabase
      .channel(`transactions-realtime-${salonId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `salon_id=eq.${salonId}` },
        () => {
          // A fresh ordered snapshot handles INSERT/UPDATE/DELETE consistently,
          // including an event racing the initial fetch or a confirmed RPC.
          if (isCurrentContext()) void fetchTransactions();
        }
      )
      .subscribe();
    return () => {
      scope.invalidate();
      void supabase.removeChannel(channel);
    };
  }, [contextKey, isReady]);

  return (
    <TransactionsContext.Provider
      value={{
        transactions: visibleTransactions,
        loading: transactionsContext.current !== contextKey || loading,
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
