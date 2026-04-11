import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { CalendarDays, CalendarRange, CalendarCheck } from 'lucide-react';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';

const TotalRevenueReport = () => {
  const { transactions } = useSupabaseTransactions();

  const now = new Date();

  const caJour = useMemo(() => {
    const s = startOfDay(now);
    const e = endOfDay(now);
    return transactions
      .filter(tx => { const d = new Date(tx.transactionDate); return d >= s && d <= e; })
      .reduce((sum, tx) => sum + tx.totalAmount, 0);
  }, [transactions]);

  const caSemaine = useMemo(() => {
    const s = startOfWeek(now, { weekStartsOn: 1 });
    const e = endOfWeek(now, { weekStartsOn: 1 });
    return transactions
      .filter(tx => { const d = new Date(tx.transactionDate); return d >= s && d <= e; })
      .reduce((sum, tx) => sum + tx.totalAmount, 0);
  }, [transactions]);

  const caMois = useMemo(() => {
    const s = startOfMonth(now);
    const e = endOfMonth(now);
    return transactions
      .filter(tx => { const d = new Date(tx.transactionDate); return d >= s && d <= e; })
      .reduce((sum, tx) => sum + tx.totalAmount, 0);
  }, [transactions]);

  const stats = [
    {
      label: "CA du jour",
      value: caJour,
      icon: CalendarDays,
      gradient: 'from-emerald-500 to-emerald-600',
      glow: 'shadow-emerald-500/20',
    },
    {
      label: "CA de la semaine",
      value: caSemaine,
      icon: CalendarRange,
      gradient: 'from-blue-500 to-blue-600',
      glow: 'shadow-blue-500/20',
    },
    {
      label: "CA du mois",
      value: caMois,
      icon: CalendarCheck,
      gradient: 'from-violet-500 to-violet-600',
      glow: 'shadow-violet-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={`relative overflow-hidden p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl ${stat.glow}`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.07]`} />
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white mb-4 shadow-lg ${stat.glow}`}>
            <stat.icon className="h-7 w-7" />
          </div>
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {stat.value.toFixed(2)}€
          </p>
          <p className="text-sm text-muted-foreground mt-2 font-medium">{stat.label}</p>
        </Card>
      ))}
    </div>
  );
};

export default TotalRevenueReport;
