import { useTransactions } from '@/contexts/TransactionsContext';
import { buildCombinedStats } from '@/lib/paymentStats';
export type { Transaction } from '@/lib/transactions';

/** Compatibility API: every screen now reads the same salon-scoped snapshot. */
export const useSupabaseTransactions = () => {
  const context = useTransactions();
  const getStats = () => buildCombinedStats(context.transactions);
  const getCustomStats = (startDate: Date, endDate: Date) => {
    const transactions = context.transactions.filter(tx => tx.transactionDate >= startDate && tx.transactionDate <= endDate);
    return {
      totalRevenue: transactions.reduce((sum, tx) => sum + Math.round(tx.totalAmount * 100), 0) / 100,
      totalClients: transactions.length,
      transactions,
    };
  };
  return { ...context, getStats, getCustomStats };
};
