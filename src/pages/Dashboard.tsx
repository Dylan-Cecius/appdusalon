import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useCombinedStats } from '@/hooks/useCombinedStats';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import MainLayout from '@/components/MainLayout';
import {
  DollarSign, Users, AlertTriangle, TrendingUp, TrendingDown,
  ArrowRight, CalendarCheck, BarChart3, Target, Clock, Bell, Download, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(45 90% 65%)',
  'hsl(0 70% 60%)',
];

const Dashboard = () => {
  const { stats } = useCombinedStats();
  const { transactions } = useTransactions();
  const { appointments } = useSupabaseAppointments();
  const { subscription_end, subscribed } = useSubscription();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const monthAppointments = useMemo(() =>
    appointments.filter(a => new Date(a.startTime) >= startOfMonth && a.status !== 'cancelled'),
    [appointments]
  );
  const prevMonthAppointments = useMemo(() =>
    appointments.filter(a => {
      const d = new Date(a.startTime);
      return d >= startOfPrevMonth && d <= endOfPrevMonth && a.status !== 'cancelled';
    }), [appointments]
  );

  const todayDistinctClients = useMemo(() => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return transactions.filter(tx => {
      const d = new Date(tx.transactionDate);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()) >= startOfToday;
    }).length;
  }, [transactions]);

  const yesterdayDistinctClients = useMemo(() => {
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return transactions.filter(tx => {
      const d = new Date(tx.transactionDate);
      const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return local >= startOfYesterday && local < startOfToday;
    }).length;
  }, [transactions]);

  const revenueChartData = useMemo(() => {
    const months: { name: string; ca: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const label = format(mStart, 'MMM', { locale: fr });
      const txRevenue = transactions
        .filter(tx => { const d = new Date(tx.transactionDate); return d >= mStart && d <= mEnd; })
        .reduce((s, tx) => s + tx.totalAmount, 0);
      const aptRevenue = appointments
        .filter(a => { const d = new Date(a.startTime); return d >= mStart && d <= mEnd && a.isPaid; })
        .reduce((s, a) => s + Number(a.totalPrice), 0);
      months.push({ name: label.charAt(0).toUpperCase() + label.slice(1), ca: Math.round(txRevenue + aptRevenue) });
    }
    return months;
  }, [transactions, appointments]);

  const statusData = useMemo(() => {
    const all = appointments.filter(a => new Date(a.startTime) >= startOfMonth);
    if (all.length === 0) return [];
    const result = [
      { name: 'Complétés', value: all.filter(a => a.status === 'completed').length },
      { name: 'En attente', value: all.filter(a => a.status === 'scheduled').length },
      { name: 'Annulés', value: all.filter(a => a.status === 'cancelled').length },
    ].filter(d => d.value > 0);
    return result.reduce((s, d) => s + d.value, 0) === 0 ? [] : result;
  }, [appointments]);

  const upcomingAppointments = useMemo(() =>
    appointments
      .filter(a => new Date(a.startTime) > now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5),
    [appointments]
  );

  const monthlyGoalCA = Math.max(stats.previousMonthRevenue, 1);
  const caProgress = Math.min(Math.round((stats.monthlyRevenue / monthlyGoalCA) * 100), 150);
  const rdvGoal = Math.max(prevMonthAppointments.length, 1);
  const rdvProgress = Math.min(Math.round((monthAppointments.length / rdvGoal) * 100), 150);
  const showSubscriptionAlert = subscribed && subscription_end &&
    new Date(subscription_end) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const Variation = ({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) => {
    if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">—</span>;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
    const pos = change >= 0;
    return (
      <span className={`text-xs flex items-center gap-1 font-medium ${pos ? 'text-pos-success' : 'text-destructive'}`}>
        {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {pos ? '+' : ''}{change.toFixed(0)}% {suffix}
      </span>
    );
  };

  const kpiInitials = (name: string) => name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col gap-3 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">
              Bonjour <span className="font-serif italic text-primary">— ça pousse ?</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vue d'ensemble de votre activité — {format(now, 'EEEE d MMMM', { locale: fr })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:flex">
              <span className="live-dot" /> Live
            </span>
            <Button asChild variant="outline" size="sm">
              <Link to="/stats"><BarChart3 className="mr-2 h-4 w-4" />Stats</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/pos"><DollarSign className="mr-2 h-4 w-4" />Encaissement</Link>
            </Button>
          </div>
        </div>

        {showSubscriptionAlert && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Abonnement bientôt expiré</AlertTitle>
            <AlertDescription>
              Expire le {format(new Date(subscription_end!), 'dd MMMM yyyy', { locale: fr })}.
              <Link to="/abonnements" className="underline ml-2">Renouveler</Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Hero CA du jour */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest opacity-70">Chiffre d'affaires du jour</div>
              <div className="mt-2 flex items-baseline gap-1 text-5xl font-medium tracking-tight leading-none">
                {stats.todayRevenue.toFixed(0)}<span className="font-serif italic text-3xl">€</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm opacity-90">
                <Variation current={stats.todayRevenue} previous={0} suffix="vs hier" />
              </div>
            </div>
            <div className="text-right text-sm opacity-90">
              <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">Encaissements</div>
              <div className="text-xl font-semibold">{transactions.filter(tx => {
                const d = new Date(tx.transactionDate);
                const today = new Date();
                return d.toDateString() === today.toDateString();
              }).length} transactions</div>
            </div>
          </CardContent>
        </Card>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">CA hebdomadaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium tracking-tight">{stats.weeklyRevenue.toFixed(0)} <span className="text-sm text-muted-foreground">€</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">CA mensuel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium tracking-tight">{stats.monthlyRevenue.toFixed(0)} <span className="text-sm text-muted-foreground">€</span></div>
              <Variation current={stats.monthlyRevenue} previous={stats.previousMonthRevenue} suffix="vs préc." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Clients du jour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium tracking-tight">{todayDistinctClients}</div>
              <Variation current={todayDistinctClients} previous={yesterdayDistinctClients} suffix="vs hier" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">RDV à venir</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-medium tracking-tight">{upcomingAppointments.length}</div>
              <span className="text-xs text-muted-foreground">cette semaine</span>
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" /> CA sur 6 mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis dataKey="name" className="fill-muted-foreground" tick={{ fontSize: 11 }} />
                    <YAxis className="fill-muted-foreground" tick={{ fontSize: 10 }} tickFormatter={v => `${v}€`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }}
                      formatter={(value: number) => [`${value} €`, 'CA']}
                    />
                    <Area type="monotone" dataKey="ca" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#caGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <CalendarCheck className="h-4 w-4 text-primary" /> Statuts RDV
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="42%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {statusData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                      </Pie>
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Pas de rendez-vous prévus</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom: upcoming + progress */}
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-4 w-4 text-primary" /> Prochains rendez-vous
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Aucun rendez-vous à venir</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {upcomingAppointments.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {kpiInitials(apt.clientName || 'XX')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{apt.clientName}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {format(new Date(apt.startTime), 'EEE dd MMM • HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <div className="font-mono text-sm font-semibold">{Number(apt.totalPrice).toFixed(0)} €</div>
                    </div>
                  ))}
                  <Button asChild variant="ghost" size="sm" className="mt-2 w-full">
                    <Link to="/agenda" className="flex items-center justify-center text-sm">
                      Voir l'agenda <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Target className="h-4 w-4 text-primary" /> Progression du mois
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">CA généré</span>
                  <span className="font-mono font-medium">{stats.monthlyRevenue.toFixed(0)} € / {monthlyGoalCA.toFixed(0)} €</span>
                </div>
                <Progress value={Math.min(caProgress, 100)} className="h-2" />
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{caProgress}% du mois précédent</p>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">RDV réservés</span>
                  <span className="font-mono font-medium">{monthAppointments.length} / {rdvGoal}</span>
                </div>
                <Progress value={Math.min(rdvProgress, 100)} className="h-2" />
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{rdvProgress}% du mois précédent</p>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Clients du jour</span>
                  <span className="font-mono font-medium">{todayDistinctClients}</span>
                </div>
                <Progress value={Math.min(todayDistinctClients * 10, 100)} className="h-2" />
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">Encaissements aujourd'hui</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
