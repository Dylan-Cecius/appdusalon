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
  DollarSign, Users, Calendar, AlertTriangle, TrendingUp, TrendingDown,
  ArrowRight, CalendarCheck, BarChart3, Target, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const CHART_COLORS = [
  'hsl(142, 71%, 45%)',  // completed - green
  'hsl(45, 85%, 65%)',   // pending - gold
  'hsl(0, 72%, 51%)',    // cancelled - red
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

  // --- KPI: Appointments this month (excl cancelled) ---
  const monthAppointments = useMemo(() =>
    appointments.filter(a => new Date(a.startTime) >= startOfMonth && a.status !== 'cancelled'),
    [appointments]
  );
  const prevMonthAppointments = useMemo(() =>
    appointments.filter(a => {
      const d = new Date(a.startTime);
      return d >= startOfPrevMonth && d <= endOfPrevMonth && a.status !== 'cancelled';
    }),
    [appointments]
  );

  // --- KPI: Clients encaissés aujourd'hui (distinct clients from today's transactions) ---
  const todayDistinctClients = useMemo(() => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayTx = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate()) >= startOfToday;
    });
    return todayTx.length;
  }, [transactions]);

  // --- Previous day clients for comparison ---
  const yesterdayDistinctClients = useMemo(() => {
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayTx = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      const txLocal = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
      return txLocal >= startOfYesterday && txLocal < startOfToday;
    });
    return yesterdayTx.length;
  }, [transactions]);

  // --- Revenue chart: 6 months ---
  const revenueChartData = useMemo(() => {
    const months: { name: string; ca: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const label = format(mStart, 'MMM', { locale: fr });
      const ca = appointments
        .filter(a => {
          const d = new Date(a.startTime);
          return d >= mStart && d <= mEnd && a.status === 'completed';
        })
        .reduce((s, a) => s + Number(a.totalPrice), 0);
      months.push({ name: label.charAt(0).toUpperCase() + label.slice(1), ca: Math.round(ca) });
    }
    return months;
  }, [appointments]);

  // --- Pie: appointment statuses this month ---
  const statusData = useMemo(() => {
    const all = appointments.filter(a => new Date(a.startTime) >= startOfMonth);
    const completed = all.filter(a => a.status === 'completed').length;
    const pending = all.filter(a => a.status === 'scheduled').length;
    const cancelled = all.filter(a => a.status === 'cancelled').length;
    return [
      { name: 'Complétés', value: completed },
      { name: 'En attente', value: pending },
      { name: 'Annulés', value: cancelled },
    ].filter(d => d.value > 0);
  }, [appointments]);

  // --- Upcoming appointments ---
  const upcomingAppointments = useMemo(() =>
    appointments
      .filter(a => new Date(a.startTime) > now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5),
    [appointments]
  );

  // --- Progress: monthly goals ---
  const monthlyGoalCA = Math.max(stats.previousMonthRevenue, 1);
  const caProgress = Math.min(Math.round((stats.monthlyRevenue / monthlyGoalCA) * 100), 150);
  const rdvGoal = Math.max(prevMonthAppointments.length, 1);
  const rdvProgress = Math.min(Math.round((monthAppointments.length / rdvGoal) * 100), 150);

  // --- Subscription alert ---
  const showSubscriptionAlert = subscribed && subscription_end &&
    new Date(subscription_end) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // --- Variation helper ---
  const Variation = ({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) => {
    if (previous === 0 && current === 0) return <span className="text-[10px] sm:text-xs text-muted-foreground">—</span>;
    const change = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
    const pos = change >= 0;
    return (
      <span className={`text-[10px] sm:text-xs flex items-center gap-0.5 ${pos ? 'text-pos-success' : 'text-destructive'}`}>
        {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {pos ? '+' : ''}{change.toFixed(0)}%{suffix && ` ${suffix}`}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-sm text-muted-foreground">Vue d'ensemble de votre activité</p>
          </div>
          <div className="flex gap-2">
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

        {/* 4 KPI Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {/* CA du mois */}
          <Card className="border-2 hover:border-accent/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">CA du mois</CardTitle>
              <div className="p-1.5 rounded-lg bg-pos-success/10">
                <DollarSign className="h-4 w-4 text-pos-success" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.monthlyRevenue.toFixed(0)} €</div>
              <Variation current={stats.monthlyRevenue} previous={stats.previousMonthRevenue} suffix="vs mois préc." />
            </CardContent>
          </Card>

          {/* RDV ce mois */}
          <Card className="border-2 hover:border-accent/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">RDV ce mois</CardTitle>
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{monthAppointments.length}</div>
              <Variation current={monthAppointments.length} previous={prevMonthAppointments.length} />
            </CardContent>
          </Card>

          {/* Nouveaux clients */}
          <Card className="border-2 hover:border-accent/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Nouveaux clients</CardTitle>
              <div className="p-1.5 rounded-lg bg-accent/10">
                <Users className="h-4 w-4 text-accent-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{newClientsThisMonth}</div>
              <Variation current={newClientsThisMonth} previous={newClientsPrevMonth} />
            </CardContent>
          </Card>

          {/* Taux d'occupation */}
          <Card className="border-2 hover:border-accent/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Taux d'occupation</CardTitle>
              <div className="p-1.5 rounded-lg bg-pos-card/10">
                <Target className="h-4 w-4 text-pos-card" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{occupancyRate}%</div>
              <Variation current={occupancyRate} previous={prevOccupancyRate} />
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Revenue 6 months - AreaChart */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-pos-success" />
                CA sur 6 mois
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="h-[220px] sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
                    <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} tickFormatter={v => `${v}€`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 13 }}
                      formatter={(value: number) => [`${value} €`, 'CA']}
                    />
                    <Area type="monotone" dataKey="ca" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#caGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Statuts RDV - PieChart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                Statuts RDV
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="h-[220px] sm:h-[260px]">
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="45%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {statusData.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Aucun RDV ce mois</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom row: upcoming + progress */}
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Upcoming appointments */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent-foreground" />
                Prochains rendez-vous
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">Aucun rendez-vous à venir</p>
              ) : (
                <div className="space-y-2">
                  {upcomingAppointments.map(apt => (
                    <div key={apt.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-accent/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{apt.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(apt.startTime), 'EEE dd MMM • HH:mm', { locale: fr })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">{Number(apt.totalPrice).toFixed(0)} €</p>
                      </div>
                    </div>
                  ))}
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link to="/agenda" className="flex items-center justify-center text-sm">
                      Voir l'agenda <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progression du mois */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-pos-success" />
                Progression du mois
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">CA généré</span>
                  <span className="text-sm font-semibold">{stats.monthlyRevenue.toFixed(0)} € <span className="text-muted-foreground font-normal">/ {monthlyGoalCA.toFixed(0)} €</span></span>
                </div>
                <Progress value={Math.min(caProgress, 100)} className="h-2.5" />
                <p className="text-[10px] text-muted-foreground mt-1">{caProgress}% du mois précédent</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">RDV réservés</span>
                  <span className="text-sm font-semibold">{monthAppointments.length} <span className="text-muted-foreground font-normal">/ {rdvGoal}</span></span>
                </div>
                <Progress value={Math.min(rdvProgress, 100)} className="h-2.5" />
                <p className="text-[10px] text-muted-foreground mt-1">{rdvProgress}% du mois précédent</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-muted-foreground">Taux complétion</span>
                  <span className="text-sm font-semibold">{occupancyRate}%</span>
                </div>
                <Progress value={occupancyRate} className="h-2.5" />
                <p className="text-[10px] text-muted-foreground mt-1">RDV complétés / total</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
