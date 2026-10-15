import { useTransactions } from '@/contexts/TransactionsContext';
export type { Transaction } from '@/contexts/TransactionsContext';

/** Compatibility facade: all screens share the same scoped feed and subscription. */
export const useSupabaseTransactions = () => {
  const { transactions, loading, error, addTransaction, deleteTransaction, refreshTransactions } = useTransactions();

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

  return {
    transactions, loading, error, addTransaction, deleteTransaction,
    getStats, getCustomStats, refreshTransactions,
  };
};
