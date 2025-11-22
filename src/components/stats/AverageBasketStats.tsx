import { Card } from '@/components/ui/card';
import { ShoppingCart, TrendingUp } from 'lucide-react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useMemo } from 'react';

export const AverageBasketStats = () => {
  const { transactions } = useTransactions();
  const { appointments } = useSupabaseAppointments();

  const averageBaskets = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Filter transactions by period
    const todayTx = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      const txDateLocal = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
      return txDateLocal >= startOfToday;
    });
    const monthTx = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= startOfMonth;
    });
    const yearTx = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= startOfYear;
    });

    // Filter appointments by period (only paid ones)
    const todayApts = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      const aptDateLocal = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate());
      return aptDateLocal >= startOfToday && apt.isPaid;
    });
    const monthApts = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfMonth && apt.isPaid;
    });
    const yearApts = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfYear && apt.isPaid;
    });

    // Calculate average baskets
    const todayRevenue = todayTx.reduce((sum, tx) => sum + tx.totalAmount, 0) +
                        todayApts.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
    const monthRevenue = monthTx.reduce((sum, tx) => sum + tx.totalAmount, 0) +
                        monthApts.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
    const yearRevenue = yearTx.reduce((sum, tx) => sum + tx.totalAmount, 0) +
                       yearApts.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);

    const todayCount = todayTx.length + todayApts.length;
    const monthCount = monthTx.length + monthApts.length;
    const yearCount = yearTx.length + yearApts.length;

    return {
      today: todayCount > 0 ? todayRevenue / todayCount : 0,
      month: monthCount > 0 ? monthRevenue / monthCount : 0,
      year: yearCount > 0 ? yearRevenue / yearCount : 0,
    };
  }, [transactions, appointments]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Panier Moyen
        </h3>
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Aujourd'hui</p>
            <p className="text-2xl font-bold text-primary">
              {averageBaskets.today.toFixed(2)}€
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">J</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Ce mois</p>
            <p className="text-2xl font-bold text-primary">
              {averageBaskets.month.toFixed(2)}€
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">M</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Cette année</p>
            <p className="text-2xl font-bold text-primary">
              {averageBaskets.year.toFixed(2)}€
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">A</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
