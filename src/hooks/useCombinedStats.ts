import { useEffect, useMemo, useState } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { buildCombinedStats } from '@/lib/paymentStats';

export const useCombinedStats = () => {
  const { transactions } = useTransactions();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const stats = useMemo(() => buildCombinedStats(transactions, now), [transactions, now]);
  return { stats };
};
