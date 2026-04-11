import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarDays, CalendarRange, CalendarCheck, CalendarIcon, X, Filter } from 'lucide-react';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';

const TotalRevenueReport = () => {
  const { transactions } = useSupabaseTransactions();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

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

  const caCustom = useMemo(() => {
    if (!startDate && !endDate) return null;
    const s = startDate ? startOfDay(startDate) : new Date(0);
    const e = endDate ? endOfDay(endDate) : new Date();
    const filtered = transactions.filter(tx => {
      const d = new Date(tx.transactionDate);
      return d >= s && d <= e;
    });
    return {
      total: filtered.reduce((sum, tx) => sum + tx.totalAmount, 0),
      count: filtered.length,
    };
  }, [transactions, startDate, endDate]);

  const handleClear = () => { setStartDate(undefined); setEndDate(undefined); };

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
    <div className="space-y-6">
      {/* 3 KPI boxes */}
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

      {/* Custom date range picker */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          Période personnalisée
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'dd/MM/yyyy') : 'Date début'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={fr} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'dd/MM/yyyy') : 'Date fin'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={fr} className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
          {(startDate || endDate) && (
            <Button size="sm" variant="ghost" onClick={handleClear}>
              <X className="h-4 w-4 mr-1" />
              Effacer
            </Button>
          )}
        </div>

        {/* Custom period result */}
        {caCustom && (
          <Card className="relative overflow-hidden p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl shadow-amber-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-600 opacity-[0.07]" />
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white mb-4 shadow-lg shadow-amber-500/20">
              <CalendarRange className="h-7 w-7" />
            </div>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {caCustom.total.toFixed(2)}€
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              {startDate && endDate
                ? `Du ${format(startDate, 'dd/MM/yyyy')} au ${format(endDate, 'dd/MM/yyyy')}`
                : startDate
                  ? `À partir du ${format(startDate, 'dd/MM/yyyy')}`
                  : `Jusqu'au ${format(endDate!, 'dd/MM/yyyy')}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{caCustom.count} transaction{caCustom.count > 1 ? 's' : ''}</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TotalRevenueReport;
