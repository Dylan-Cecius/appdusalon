import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { DetailedPaymentReport } from '@/components/DetailedPaymentReport';

export default function DetailedReportsView() {
  const { transactions } = useSupabaseTransactions();
  return <DetailedPaymentReport transactions={transactions} />;
}
