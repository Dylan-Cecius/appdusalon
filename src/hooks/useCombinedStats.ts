import { useMemo } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';

const countDistinctClients = <T extends { clientId?: string }>(transactions: T[]) => {
  const knownClients = new Set(transactions.map(transaction => transaction.clientId).filter(Boolean));
  const anonymousTransactions = transactions.filter(transaction => !transaction.clientId).length;
  return knownClients.size + anonymousTransactions;
};

export const useCombinedStats = () => {
  const { transactions } = useTransactions();

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const todayTransactions = transactions.filter(transaction => {
      const date = new Date(transaction.transactionDate);
      return date >= startOfToday;
    });

    const weekTransactions = transactions.filter(
      transaction => new Date(transaction.transactionDate) >= startOfWeek
    );

    const monthTransactions = transactions.filter(
      transaction => new Date(transaction.transactionDate) >= startOfMonth
    );

    const previousMonthTransactions = transactions.filter(transaction => {
      const date = new Date(transaction.transactionDate);
      return date >= startOfPrevMonth && date <= endOfPrevMonth;
    });

    const todayRevenue = todayTransactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0);
    const weeklyRevenue = weekTransactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0);
    const monthlyRevenue = monthTransactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0);
    const previousMonthRevenue = previousMonthTransactions.reduce(
      (sum, transaction) => sum + transaction.totalAmount,
      0
    );

    const todayClients = countDistinctClients(todayTransactions);
    const weeklyClients = countDistinctClients(weekTransactions);
    const monthlyClients = countDistinctClients(monthTransactions);

    const buildPaymentStats = (periodTransactions: typeof transactions) => {
      const cashTransactions = periodTransactions.filter(transaction => transaction.paymentMethod === 'cash');
      const cardTransactions = periodTransactions.filter(transaction => transaction.paymentMethod === 'card');
      const totalCount = cashTransactions.length + cardTransactions.length;

      return {
        cash: cashTransactions.length,
        card: cardTransactions.length,
        cashAmount: cashTransactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0),
        cardAmount: cardTransactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0),
        cashPercent: totalCount > 0 ? (cashTransactions.length / totalCount) * 100 : 0,
        cardPercent: totalCount > 0 ? (cardTransactions.length / totalCount) * 100 : 0,
      };
    };

    return {
      todayRevenue,
      todayClients,
      weeklyRevenue,
      weeklyClients,
      monthlyRevenue,
      previousMonthRevenue,
      monthlyClients,
      paymentStats: {
        today: buildPaymentStats(todayTransactions),
        weekly: buildPaymentStats(weekTransactions),
        monthly: buildPaymentStats(monthTransactions),
      },
    };
  }, [transactions]);

  return { stats };
};
