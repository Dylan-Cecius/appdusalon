import { Card } from '@/components/ui/card';
import { ShoppingCart, TrendingUp } from 'lucide-react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useMemo } from 'react';

export const AverageBasketStats = () => {
  const { transactions } = useTransactions();

  const averageBaskets = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const averageForPeriod = (start: Date) => {
      const periodTransactions = transactions.filter(
        transaction => new Date(transaction.transactionDate) >= start
      );
      const revenue = periodTransactions.reduce(
        (sum, transaction) => sum + transaction.totalAmount,
        0
      );
      return periodTransactions.length > 0 ? revenue / periodTransactions.length : 0;
    };

    return {
      today: averageForPeriod(startOfToday),
      month: averageForPeriod(startOfMonth),
      year: averageForPeriod(startOfYear),
    };
  }, [transactions]);

  return (
    <Card className="v2-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Panier moyen
        </h3>
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="space-y-4">
        {[
          { label: "Aujourd'hui", value: averageBaskets.today, badge: 'J' },
          { label: 'Ce mois', value: averageBaskets.month, badge: 'M' },
          { label: 'Cette année', value: averageBaskets.year, badge: 'A' },
        ].map(period => (
          <div key={period.badge} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
            <div>
              <p className="text-sm text-muted-foreground">{period.label}</p>
              <p className="text-2xl font-bold text-primary">{period.value.toFixed(2)}€</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">{period.badge}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
