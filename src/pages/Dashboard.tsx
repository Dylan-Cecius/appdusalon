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
  ArrowRight, BarChart3, Target, Clock, Calculator
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';

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

  // --- Revenue chart: 6 months (from transactions + paid appointments) ---
  const revenueChartData = useMemo(() => {
    const months: { name: string; ca: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const label = format(mStart, 'MMM', { locale: fr });
      // Revenue from transactions
      const txRevenue = transactions
        .filter(tx => {
          const d = new Date(tx.transactionDate);
          return d >= mStart && d <= mEnd;
        })
        .reduce((s, tx) => s + tx.totalAmount, 0);
      // Revenue from paid appointments
      const aptRevenue = appointments
        .filter(a => {
          const d = new Date(a.startTime);
          return d >= mStart && d <= mEnd && a.isPaid;
        })
        .reduce((s, a) => s + Number(a.totalPrice), 0);
      months.push({ name: label.charAt(0).toUpperCase() + label.slice(1), ca: Math.round(txRevenue + aptRevenue) });
    }
    return months;
  }, [transactions, appointments]);

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

  // --- Monthly CA Projection ---
  const {
    elapsedBusinessDays,
    remainingBusinessDays,
    totalBusinessDays,
    dailyRate,
    projectedCA,
    projectionProgress,
  } = useMemo(() => {
    const countBusinessDays = (start: Date, end: Date) => {
      let count = 0;
      const d = new Date(start);
      d.setHours(0, 0, 0, 0);
      const endNorm = new Date(end);
      endNorm.setHours(0, 0, 0, 0);
      while (d <= endNorm) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return count;
    };

    const startOfMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const elapsed = countBusinessDays(startOfMonthDate, now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const remaining = countBusinessDays(tomorrow, endOfMonthDate);
    const total = elapsed + remaining;

    const rate = elapsed > 0 ? stats.monthlyRevenue / elapsed : 0;
    const projected = stats.monthlyRevenue + rate * remaining;
    const progress = total > 0 ? Math.round((elapsed / total) * 100) : 0;

    return {
      elapsedBusinessDays: elapsed,
      remainingBusinessDays: remaining,
      totalBusinessDays: total,
      dailyRate: rate,
      projectedCA: projected,
      projectionProgress: progress,
    };
  }, [now, stats.monthlyRevenue]);

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
          {/* CA du jour */}
          <Card className="border-2 hover:border-accent/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">CA du jour</CardTitle>
              <div className="p-1.5 rounded-lg bg-pos-success/10">
                <DollarSign className="h-4 w-4 text-pos-success" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.todayRevenue.toFixed(0)} €</div>
            </CardContent>
          </Card>

          {/* CA Hebdomadaire */}
          <Card className="border-2 hover:border-accent/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">CA hebdomadaire</CardTitle>
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.weeklyRevenue.toFixed(0)} €</div>
            </CardContent>
          </Card>

          {/* CA Mensuel */}
          <Card className="border-2 hover:border-accent/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">CA Mensuel</CardTitle>
              <div className="p-1.5 rounded-lg bg-accent/10">
                <BarChart3 className="h-4 w-4 text-accent-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.monthlyRevenue.toFixed(0)} €</div>
              <Variation current={stats.monthlyRevenue} previous={stats.previousMonthRevenue} suffix="vs mois préc." />
            </CardContent>
          </Card>

          {/* Clients encaissés aujourd'hui */}
          <Card className="border-2 hover:border-accent/50 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3 sm:p-5 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Clients du jour</CardTitle>
              <div className="p-1.5 rounded-lg bg-pos-card/10">
                <Users className="h-4 w-4 text-pos-card" />
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-5 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{todayDistinctClients}</div>
              <Variation current={todayDistinctClients} previous={yesterdayDistinctClients} suffix="vs hier" />
            </CardContent>
          </Card>
        </div>

        {/* Projection CA mensuel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Projection CA mensuel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">CA réalisé ce mois</p>
                <p className="text-lg font-bold">{stats.monthlyRevenue.toFixed(0)} €</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jours ouvrés écoulés</p>
                <p className="text-lg font-bold">{elapsedBusinessDays}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jours ouvrés restants</p>
                <p className="text-lg font-bold">{remainingBusinessDays}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taux journalier moyen</p>
                <p className="text-lg font-bold">{dailyRate.toFixed(0)} €</p>
              </div>
            </div>

            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground mb-1">CA projeté fin de mois</p>
              <p className="text-3xl sm:text-4xl font-bold text-primary">{projectedCA.toFixed(0)} €</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-muted-foreground">Avancement du mois</span>
                <span className="text-sm font-semibold">{projectionProgress}%</span>
              </div>
              <Progress value={projectionProgress} className="h-2.5" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {elapsedBusinessDays} jours ouvrés écoulés sur {totalBusinessDays} au total
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Revenue chart - full width */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              CA sur 6 mois
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="h-[220px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} tickFormatter={v => `${v}€`} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 13 }}
                    formatter={(value: number) => [`${value} €`, 'CA']}
                  />
                  <Line type="monotone" dataKey="ca" stroke="hsl(243, 75%, 59%)" strokeWidth={2.5} dot={{ r: 3, fill: 'hsl(243, 75%, 59%)' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
                  <span className="text-sm text-muted-foreground">Clients du jour</span>
                  <span className="text-sm font-semibold">{todayDistinctClients}</span>
                </div>
                <Progress value={Math.min(todayDistinctClients * 10, 100)} className="h-2.5" />
                <p className="text-[10px] text-muted-foreground mt-1">Encaissements aujourd'hui</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
