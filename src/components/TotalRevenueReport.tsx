import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Euro, TrendingUp, Banknote, CreditCard, CalendarDays } from 'lucide-react';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  subMonths,
  isSameMonth,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';

type ViewType = 'daily' | 'weekly' | 'monthly';

interface BucketData {
  label: string;
  transactions: number;
  cashAmount: number;
  cardAmount: number;
  totalAmount: number;
}

const TotalRevenueReport = () => {
  const { transactions } = useSupabaseTransactions();

  const [view, setView] = useState<ViewType>('daily');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const rangeStart = useMemo(() => startOfDay(new Date(startDate)), [startDate]);
  const rangeEnd = useMemo(() => endOfDay(new Date(endDate)), [endDate]);

  // Filter all transactions within the date range
  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      const d = new Date(tx.transactionDate);
      return d >= rangeStart && d <= rangeEnd;
    });
  }, [transactions, rangeStart, rangeEnd]);

  // Build buckets based on view
  const buckets: BucketData[] = useMemo(() => {
    if (view === 'daily') {
      const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      return days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dayTx = filteredTx.filter(tx => {
          const d = new Date(tx.transactionDate);
          return d >= dayStart && d <= dayEnd;
        });
        const cash = dayTx.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + t.totalAmount, 0);
        const card = dayTx.filter(t => t.paymentMethod === 'card').reduce((s, t) => s + t.totalAmount, 0);
        return {
          label: format(day, 'EEE dd/MM', { locale: fr }),
          transactions: dayTx.length,
          cashAmount: cash,
          cardAmount: card,
          totalAmount: cash + card,
        };
      });
    }

    if (view === 'weekly') {
      const weeks = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 });
      return weeks.map(weekStart => {
        const wStart = startOfWeek(weekStart, { weekStartsOn: 1 });
        const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekTx = filteredTx.filter(tx => {
          const d = new Date(tx.transactionDate);
          return d >= wStart && d <= wEnd;
        });
        const cash = weekTx.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + t.totalAmount, 0);
        const card = weekTx.filter(t => t.paymentMethod === 'card').reduce((s, t) => s + t.totalAmount, 0);
        return {
          label: `${format(wStart, 'dd/MM', { locale: fr })} — ${format(wEnd, 'dd/MM', { locale: fr })}`,
          transactions: weekTx.length,
          cashAmount: cash,
          cardAmount: card,
          totalAmount: cash + card,
        };
      });
    }

    // monthly
    const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
    return months.map(month => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const monthTx = filteredTx.filter(tx => {
        const d = new Date(tx.transactionDate);
        return d >= mStart && d <= mEnd;
      });
      const cash = monthTx.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + t.totalAmount, 0);
      const card = monthTx.filter(t => t.paymentMethod === 'card').reduce((s, t) => s + t.totalAmount, 0);
      return {
        label: format(month, 'MMMM yyyy', { locale: fr }),
        transactions: monthTx.length,
        cashAmount: cash,
        cardAmount: card,
        totalAmount: cash + card,
      };
    });
  }, [view, filteredTx, rangeStart, rangeEnd]);

  const totals = useMemo(() => {
    return buckets.reduce(
      (acc, b) => ({
        transactions: acc.transactions + b.transactions,
        cashAmount: acc.cashAmount + b.cashAmount,
        cardAmount: acc.cardAmount + b.cardAmount,
        totalAmount: acc.totalAmount + b.totalAmount,
      }),
      { transactions: 0, cashAmount: 0, cardAmount: 0, totalAmount: 0 }
    );
  }, [buckets]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-base sm:text-lg font-semibold">CA Total — Services & Produits</h3>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="ca-start" className="flex items-center gap-2 text-sm sm:text-base">
              <CalendarDays className="h-4 w-4" />
              Date de début
            </Label>
            <Input
              id="ca-start"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full min-h-[44px]"
            />
          </div>
          <div>
            <Label htmlFor="ca-end" className="flex items-center gap-2 text-sm sm:text-base">
              <CalendarDays className="h-4 w-4" />
              Date de fin
            </Label>
            <Input
              id="ca-end"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              min={startDate}
              className="w-full min-h-[44px]"
            />
          </div>
        </div>

        {/* View toggle */}
        <Tabs value={view} onValueChange={v => setView(v as ViewType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Journalier</TabsTrigger>
            <TabsTrigger value="weekly">Hebdomadaire</TabsTrigger>
            <TabsTrigger value="monthly">Mensuel</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 text-center">
          <Euro className="h-6 w-6 mx-auto mb-2 text-primary" />
          <p className="text-xl sm:text-2xl font-bold text-primary">{totals.totalAmount.toFixed(2)}€</p>
          <p className="text-xs text-muted-foreground">CA Total</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
          <p className="text-xl sm:text-2xl font-bold text-primary">{totals.transactions}</p>
          <p className="text-xs text-muted-foreground">Transactions</p>
        </Card>
        <Card className="p-4 text-center">
          <Banknote className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
          <p className="text-xl sm:text-2xl font-bold text-emerald-500">{totals.cashAmount.toFixed(2)}€</p>
          <p className="text-xs text-muted-foreground">Cash</p>
        </Card>
        <Card className="p-4 text-center">
          <CreditCard className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <p className="text-xl sm:text-2xl font-bold text-blue-500">{totals.cardAmount.toFixed(2)}€</p>
          <p className="text-xs text-muted-foreground">Bancontact</p>
        </Card>
      </div>

      {/* Breakdown Table */}
      <Card className="p-4 sm:p-6">
        <h4 className="text-base sm:text-lg font-semibold mb-4">
          Détail {view === 'daily' ? 'Journalier' : view === 'weekly' ? 'Hebdomadaire' : 'Mensuel'}
          <span className="text-xs sm:text-sm text-muted-foreground block sm:inline sm:ml-2 mt-1 sm:mt-0">
            ({format(rangeStart, 'dd/MM/yyyy', { locale: fr })} — {format(rangeEnd, 'dd/MM/yyyy', { locale: fr })})
          </span>
        </h4>

        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs sm:text-sm">Période</TableHead>
                <TableHead className="text-center text-xs sm:text-sm">Trans.</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Cash</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Bancontact</TableHead>
                <TableHead className="text-right text-xs sm:text-sm">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buckets.map((bucket, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-xs sm:text-sm capitalize">{bucket.label}</TableCell>
                  <TableCell className="text-center text-xs sm:text-sm">{bucket.transactions}</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{bucket.cashAmount.toFixed(2)}€</TableCell>
                  <TableCell className="text-right text-xs sm:text-sm">{bucket.cardAmount.toFixed(2)}€</TableCell>
                  <TableCell className="text-right font-semibold text-xs sm:text-sm text-primary">
                    {bucket.totalAmount.toFixed(2)}€
                  </TableCell>
                </TableRow>
              ))}
              {/* Total row */}
              <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                <TableCell className="text-xs sm:text-sm">TOTAL</TableCell>
                <TableCell className="text-center text-xs sm:text-sm">{totals.transactions}</TableCell>
                <TableCell className="text-right text-xs sm:text-sm">{totals.cashAmount.toFixed(2)}€</TableCell>
                <TableCell className="text-right text-xs sm:text-sm">{totals.cardAmount.toFixed(2)}€</TableCell>
                <TableCell className="text-right text-xs sm:text-sm text-primary">
                  {totals.totalAmount.toFixed(2)}€
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {buckets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Euro className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Aucune transaction sur cette période</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default TotalRevenueReport;
