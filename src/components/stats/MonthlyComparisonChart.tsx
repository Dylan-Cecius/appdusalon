import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const countDistinctClients = (transactions: Array<{ clientId?: string }>) => {
  const knownClients = new Set(transactions.map(transaction => transaction.clientId).filter(Boolean));
  const anonymous = transactions.filter(transaction => !transaction.clientId).length;
  return knownClients.size + anonymous;
};

export const MonthlyComparisonChart = () => {
  const { transactions } = useTransactions();

  const comparisonData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const startOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfPreviousMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const currentMonthTransactions = transactions.filter(transaction => {
      const date = new Date(transaction.transactionDate);
      return date >= startOfCurrentMonth;
    });

    const previousMonthTransactions = transactions.filter(transaction => {
      const date = new Date(transaction.transactionDate);
      return date >= startOfPreviousMonth && date <= endOfPreviousMonth;
    });

    const currentRevenue = currentMonthTransactions.reduce(
      (sum, transaction) => sum + transaction.totalAmount,
      0
    );
    const previousRevenue = previousMonthTransactions.reduce(
      (sum, transaction) => sum + transaction.totalAmount,
      0
    );

    const currentClients = countDistinctClients(currentMonthTransactions);
    const previousClients = countDistinctClients(previousMonthTransactions);

    const revenueDiff = currentRevenue - previousRevenue;
    const revenuePercent = previousRevenue > 0 ? (revenueDiff / previousRevenue) * 100 : 0;

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const previousMonthName = monthNames[currentMonth === 0 ? 11 : currentMonth - 1];
    const currentMonthName = monthNames[currentMonth];

    return {
      chartData: [
        { name: previousMonthName, CA: previousRevenue, Clients: previousClients },
        { name: currentMonthName, CA: currentRevenue, Clients: currentClients },
      ],
      currentRevenue,
      previousRevenue,
      revenueDiff,
      revenuePercent,
      isPositive: revenueDiff >= 0,
    };
  }, [transactions]);

  return (
    <Card className="v2-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Comparaison mensuelle
        </h3>
      </div>

      <div className="mb-6 p-4 bg-muted/50 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Évolution du CA encaissé</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {comparisonData.revenueDiff >= 0 ? '+' : ''}{comparisonData.revenueDiff.toFixed(2)}€
            </p>
          </div>
          <div className="flex items-center gap-2">
            {comparisonData.isPositive ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
            <div className="text-right">
              <p className={`text-xl font-bold ${comparisonData.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                {comparisonData.revenuePercent >= 0 ? '+' : ''}{comparisonData.revenuePercent.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">vs mois dernier</p>
            </div>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={comparisonData.chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--foreground))' }} />
          <YAxis className="text-xs" tick={{ fill: 'hsl(var(--foreground))' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'CA') return [`${value.toFixed(2)}€`, "Chiffre d'affaires"];
              return [value, 'Clients encaissés'];
            }}
          />
          <Legend />
          <Bar dataKey="CA" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="Clients" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
