import { Card } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const MonthlyComparisonChart = () => {
  const { transactions } = useTransactions();
  const { appointments } = useSupabaseAppointments();

  const comparisonData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const startOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfPreviousMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Current month transactions
    const currentMonthTx = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= startOfCurrentMonth;
    });
    const currentMonthApts = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfCurrentMonth && apt.isPaid;
    });

    // Previous month transactions
    const previousMonthTx = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= startOfPreviousMonth && txDate <= endOfPreviousMonth;
    });
    const previousMonthApts = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfPreviousMonth && aptDate <= endOfPreviousMonth && apt.isPaid;
    });

    // Calculate revenues
    const currentRevenue = currentMonthTx.reduce((sum, tx) => sum + tx.totalAmount, 0) +
                          currentMonthApts.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
    const previousRevenue = previousMonthTx.reduce((sum, tx) => sum + tx.totalAmount, 0) +
                           previousMonthApts.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);

    // Calculate clients
    const currentClients = currentMonthTx.length + currentMonthApts.length;
    const previousClients = previousMonthTx.length + previousMonthApts.length;

    // Calculate difference
    const revenueDiff = currentRevenue - previousRevenue;
    const revenuePercent = previousRevenue > 0 ? ((revenueDiff / previousRevenue) * 100) : 0;

    // Month names
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const previousMonthName = monthNames[currentMonth === 0 ? 11 : currentMonth - 1];
    const currentMonthName = monthNames[currentMonth];

    return {
      chartData: [
        {
          name: previousMonthName,
          CA: previousRevenue,
          Clients: previousClients,
        },
        {
          name: currentMonthName,
          CA: currentRevenue,
          Clients: currentClients,
        },
      ],
      currentRevenue,
      previousRevenue,
      revenueDiff,
      revenuePercent,
      isPositive: revenueDiff >= 0,
    };
  }, [transactions, appointments]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Comparaison Mensuelle
        </h3>
      </div>

      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Évolution du CA</p>
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
          <XAxis 
            dataKey="name" 
            className="text-xs"
            tick={{ fill: 'hsl(var(--foreground))' }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fill: 'hsl(var(--foreground))' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'CA') return [`${value.toFixed(2)}€`, 'Chiffre d\'affaires'];
              return [value, 'Nombre de clients'];
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
