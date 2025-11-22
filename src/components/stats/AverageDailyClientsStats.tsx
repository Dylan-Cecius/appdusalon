import { Card } from '@/components/ui/card';
import { UserCheck, Calendar } from 'lucide-react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useMemo } from 'react';

export const AverageDailyClientsStats = () => {
  const { transactions } = useTransactions();
  const { appointments } = useSupabaseAppointments();

  const averages = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Group transactions by date
    const transactionsByDate: Record<string, number> = {};
    transactions.forEach(tx => {
      const txDate = new Date(tx.transactionDate);
      const dateKey = txDate.toISOString().split('T')[0];
      transactionsByDate[dateKey] = (transactionsByDate[dateKey] || 0) + 1;
    });

    // Group appointments by date
    const appointmentsByDate: Record<string, number> = {};
    appointments.forEach(apt => {
      const aptDate = new Date(apt.startTime);
      const dateKey = aptDate.toISOString().split('T')[0];
      appointmentsByDate[dateKey] = (appointmentsByDate[dateKey] || 0) + 1;
    });

    // Combine both
    const allDates = new Set([...Object.keys(transactionsByDate), ...Object.keys(appointmentsByDate)]);
    const clientsByDate: Record<string, number> = {};
    allDates.forEach(date => {
      clientsByDate[date] = (transactionsByDate[date] || 0) + (appointmentsByDate[date] || 0);
    });

    // Calculate averages
    const monthDates = Object.entries(clientsByDate).filter(([date]) => 
      new Date(date) >= startOfMonth
    );
    const yearDates = Object.entries(clientsByDate).filter(([date]) => 
      new Date(date) >= startOfYear
    );

    const monthTotal = monthDates.reduce((sum, [, count]) => sum + count, 0);
    const yearTotal = yearDates.reduce((sum, [, count]) => sum + count, 0);

    const daysInMonth = monthDates.length || 1;
    const daysInYear = yearDates.length || 1;

    return {
      month: monthTotal / daysInMonth,
      year: yearTotal / daysInYear,
      totalDaysMonth: daysInMonth,
      totalDaysYear: daysInYear,
    };
  }, [transactions, appointments]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          Moyenne Clients/Jour
        </h3>
        <Calendar className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Ce mois</p>
            <p className="text-2xl font-bold text-primary">
              {averages.month.toFixed(1)} clients/jour
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sur {averages.totalDaysMonth} jour{averages.totalDaysMonth > 1 ? 's' : ''} d'activité
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
              {averages.year.toFixed(1)} clients/jour
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sur {averages.totalDaysYear} jour{averages.totalDaysYear > 1 ? 's' : ''} d'activité
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
