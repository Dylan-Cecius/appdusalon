import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarIcon,
  TrendingUp,
  Receipt,
  ShoppingBag,
  Wallet,
  CreditCard,
} from 'lucide-react';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfHour,
  startOfISOWeek,
  eachHourOfInterval,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInDays,
  format,
  isSameHour,
  isSameDay,
  isSameWeek,
  isSameMonth,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';

type PeriodKey = 'today' | 'week' | 'month' | 'year' | 'custom';
type PaymentFilter = 'all' | 'cash' | 'card';
type CustomMode = 'range' | 'single';

const CASH_COLOR = '#10b981';
const CARD_COLOR = '#6366F1';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'custom', label: 'Personnalisé' },
];

const fmtEuro = (n: number) =>
  `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€`;

const TotalRevenueReport = () => {
  const { transactions } = useSupabaseTransactions();

  const [period, setPeriod] = useState<PeriodKey>('today');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [customMode, setCustomMode] = useState<CustomMode>('range');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [singleDate, setSingleDate] = useState<Date | undefined>();

  // Resolve the active interval based on the selected period
  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { rangeStart: startOfDay(now), rangeEnd: endOfDay(now) };
      case 'week':
        return {
          rangeStart: startOfWeek(now, { weekStartsOn: 1 }),
          rangeEnd: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case 'month':
        return { rangeStart: startOfMonth(now), rangeEnd: endOfMonth(now) };
      case 'year':
        return { rangeStart: startOfYear(now), rangeEnd: endOfYear(now) };
      case 'custom': {
        if (customMode === 'single') {
          if (!singleDate) return { rangeStart: undefined, rangeEnd: undefined };
          return { rangeStart: startOfDay(singleDate), rangeEnd: endOfDay(singleDate) };
        }
        if (!startDate && !endDate) return { rangeStart: undefined, rangeEnd: undefined };
        return {
          rangeStart: startDate ? startOfDay(startDate) : startOfDay(endDate!),
          rangeEnd: endDate ? endOfDay(endDate) : endOfDay(startDate!),
        };
      }
      default:
        return { rangeStart: undefined, rangeEnd: undefined };
    }
  }, [period, customMode, startDate, endDate, singleDate]);

  // Transactions filtered by period + payment method
  const filtered = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    return transactions.filter((tx) => {
      const d = new Date(tx.transactionDate);
      if (d < rangeStart || d > rangeEnd) return false;
      if (paymentFilter !== 'all' && tx.paymentMethod !== paymentFilter) return false;
      return true;
    });
  }, [transactions, rangeStart, rangeEnd, paymentFilter]);

  // KPI values
  const kpis = useMemo(() => {
    const total = filtered.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const count = filtered.length;
    const avg = count > 0 ? total / count : 0;
    const cash = filtered
      .filter((tx) => tx.paymentMethod === 'cash')
      .reduce((s, tx) => s + tx.totalAmount, 0);
    const card = filtered
      .filter((tx) => tx.paymentMethod === 'card')
      .reduce((s, tx) => s + tx.totalAmount, 0);
    return { total, count, avg, cash, card };
  }, [filtered]);

  // Auto-granularity time-series for the BarChart
  const chartData = useMemo(() => {
    if (!rangeStart || !rangeEnd) return [];
    const days = differenceInDays(rangeEnd, rangeStart);

    let buckets: Date[] = [];
    let labelFmt = 'dd/MM';
    let matcher: (a: Date, b: Date) => boolean = isSameDay;

    if (days <= 1) {
      buckets = eachHourOfInterval({ start: rangeStart, end: rangeEnd });
      labelFmt = 'HH:mm';
      matcher = isSameHour;
    } else if (days <= 31) {
      buckets = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      labelFmt = 'dd/MM';
      matcher = isSameDay;
    } else if (days <= 120) {
      buckets = eachWeekOfInterval({ start: rangeStart, end: rangeEnd }, { weekStartsOn: 1 });
      labelFmt = "'S'w";
      matcher = (a, b) => isSameWeek(a, b, { weekStartsOn: 1 });
    } else {
      buckets = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
      labelFmt = 'MMM';
      matcher = isSameMonth;
    }

    return buckets.map((bucket) => {
      const ref =
        matcher === isSameHour
          ? startOfHour(bucket)
          : matcher === isSameMonth
            ? startOfMonth(bucket)
            : bucket;
      const value = filtered
        .filter((tx) => matcher(new Date(tx.transactionDate), ref))
        .reduce((s, tx) => s + tx.totalAmount, 0);
      return { label: format(bucket, labelFmt, { locale: fr }), value };
    });
  }, [filtered, rangeStart, rangeEnd]);

  // Pie data Cash vs Bancontact
  const pieData = useMemo(
    () =>
      [
        { name: 'Cash', value: kpis.cash, color: CASH_COLOR },
        { name: 'Bancontact', value: kpis.card, color: CARD_COLOR },
      ].filter((d) => d.value > 0),
    [kpis.cash, kpis.card],
  );

  // Top 5 services
  const topServices = useMemo(() => {
    const map = new Map<string, { revenue: number; qty: number }>();
    filtered.forEach((tx) => {
      (tx.items || []).forEach((item) => {
        const qty = item.quantity || 1;
        const rev = (item.price || 0) * qty;
        const cur = map.get(item.name) || { revenue: 0, qty: 0 };
        cur.revenue += rev;
        cur.qty += qty;
        map.set(item.name, cur);
      });
    });
    const arr = Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
    arr.sort((a, b) => b.revenue - a.revenue);
    const top = arr.slice(0, 5);
    const max = top.length ? top[0].revenue : 0;
    return { top, max };
  }, [filtered]);

  const kpiCards = [
    {
      label: 'CA Total',
      value: fmtEuro(kpis.total),
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-emerald-600',
      glow: 'shadow-emerald-500/20',
    },
    {
      label: 'Transactions',
      value: String(kpis.count),
      icon: Receipt,
      gradient: 'from-blue-500 to-blue-600',
      glow: 'shadow-blue-500/20',
    },
    {
      label: 'Panier moyen',
      value: fmtEuro(kpis.avg),
      icon: ShoppingBag,
      gradient: 'from-violet-500 to-violet-600',
      glow: 'shadow-violet-500/20',
    },
    {
      label: 'Cash / Bancontact',
      value: `${fmtEuro(kpis.cash)} / ${fmtEuro(kpis.card)}`,
      icon: Wallet,
      gradient: 'from-amber-500 to-amber-600',
      glow: 'shadow-amber-500/20',
    },
  ];

  const paymentFilters: { key: PaymentFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'cash', label: 'Cash' },
    { key: 'card', label: 'Bancontact' },
  ];

  return (
    <div className="space-y-6">
      {/* Period pills */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={period === p.key ? 'default' : 'outline'}
            onClick={() => setPeriod(p.key)}
            className="rounded-full min-h-[40px]"
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Custom controls */}
      {period === 'custom' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={customMode === 'range' ? 'secondary' : 'ghost'}
              onClick={() => setCustomMode('range')}
            >
              Période
            </Button>
            <Button
              size="sm"
              variant={customMode === 'single' ? 'secondary' : 'ghost'}
              onClick={() => setCustomMode('single')}
            >
              Date unique
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {customMode === 'range' ? (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-[160px] justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'dd/MM/yyyy') : 'Date début'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={fr} className={cn('p-3 pointer-events-auto')} />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-[160px] justify-start text-left font-normal', !endDate && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'dd/MM/yyyy') : 'Date fin'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={fr} className={cn('p-3 pointer-events-auto')} />
                  </PopoverContent>
                </Popover>
              </>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-[160px] justify-start text-left font-normal', !singleDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {singleDate ? format(singleDate, 'dd/MM/yyyy') : 'Choisir une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={singleDate} onSelect={setSingleDate} initialFocus locale={fr} className={cn('p-3 pointer-events-auto')} />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      )}

      {/* Payment filter */}
      <div className="flex flex-wrap gap-2">
        {paymentFilters.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={paymentFilter === f.key ? 'default' : 'outline'}
            onClick={() => setPaymentFilter(f.key)}
            className="rounded-full min-h-[40px]"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((stat) => (
          <Card
            key={stat.label}
            className={`relative overflow-hidden p-5 flex flex-col items-center justify-center text-center shadow-xl ${stat.glow}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.07]`} />
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white mb-3 shadow-lg ${stat.glow}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground break-words">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Évolution du chiffre d'affaires
          </h3>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Aucune donnée sur cette période.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v: number) => fmtEuro(v)}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="value" name="CA" fill={CARD_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Répartition des paiements
          </h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Aucune donnée.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => fmtEuro(v)}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top 5 services */}
      <Card className="p-5">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          Top 5 prestations
        </h3>
        {topServices.top.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucune prestation sur cette période.</p>
        ) : (
          <div className="space-y-4">
            {topServices.top.map((svc, i) => (
              <div key={svc.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {i + 1}. {svc.name}
                    <span className="text-muted-foreground font-normal"> · {svc.qty} vendu{svc.qty > 1 ? 's' : ''}</span>
                  </span>
                  <span className="font-semibold text-foreground">{fmtEuro(svc.revenue)}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                    style={{ width: `${topServices.max > 0 ? (svc.revenue / topServices.max) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default TotalRevenueReport;
