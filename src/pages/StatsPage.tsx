import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, BarChart3, TrendingUp, Clock, Activity, PieChart } from 'lucide-react';
import { useCombinedStats } from '@/hooks/useCombinedStats';
import MainLayout from '@/components/MainLayout';
import StatsOverview from '@/components/StatsOverview';
import PaymentMethodStats from '@/components/PaymentMethodStats';
import CustomPaymentStats from '@/components/CustomPaymentStats';
import CustomDateRangeStats from '@/components/CustomDateRangeStats';
import RevenueChart from '@/components/RevenueChart';
import { ClientRetentionStats } from '@/components/stats/ClientRetentionStats';
import { BarberPerformanceStats } from '@/components/stats/BarberPerformanceStats';
import { PeakHoursStats } from '@/components/stats/PeakHoursStats';
import { CancellationRateStats } from '@/components/stats/CancellationRateStats';
import { ServiceProfitabilityStats } from '@/components/stats/ServiceProfitabilityStats';
import { OccupancyRateStats } from '@/components/stats/OccupancyRateStats';
import { AverageBasketStats } from '@/components/stats/AverageBasketStats';
import { EmployeeRevenueStats } from '@/components/stats/EmployeeRevenueStats';
import { AverageDailyClientsStats } from '@/components/stats/AverageDailyClientsStats';
import TransactionsManager from '@/components/TransactionsManager';
import { FeatureGate } from '@/components/FeatureGate';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const QUICK_LINKS = [
  { id: 'stats-overview', label: "Vue d'ensemble", icon: BarChart3 },
  { id: 'custom-date-range', label: 'CA période', icon: TrendingUp, highlight: true },
  { id: 'barber-performance', label: 'Performance coiffeurs', icon: Activity },
  { id: 'peak-hours', label: 'Heures de pointe', icon: Clock },
  { id: 'service-profitability', label: 'Rentabilité services', icon: PieChart },
  { id: 'occupancy-rate', label: "Taux d'occupation", icon: Activity },
];

const StatsPage = () => {
  const [isTransactionsManagerOpen, setIsTransactionsManagerOpen] = useState(false);
  const { stats } = useCombinedStats();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    setTimeout(() => {
      const el = document.getElementById('revenue-section');
      if (el) {
        window.scrollTo({ top: el.offsetTop - 120, behavior: 'instant' as ScrollBehavior });
      }
    }, 100);
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col gap-3 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">
              Statistiques <span className="font-serif italic text-primary">& analyses</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Analyses de performance — {format(new Date(), 'MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:flex">
              <span className="live-dot" /> Live
            </span>
            <Button
              onClick={() => setIsTransactionsManagerOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Encaissements</span>
            </Button>
          </div>
        </div>

        {/* Quick navigation card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Accès rapide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {QUICK_LINKS.map(link => {
                const Icon = link.icon;
                return (
                  <Button
                    key={link.id}
                    variant="outline"
                    size="sm"
                    onClick={() => scrollTo(link.id)}
                    className={`gap-2 text-xs ${link.highlight ? 'bg-primary/15 border-primary/30 text-primary hover:bg-primary/25' : ''}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {link.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div id="revenue-section">
          <h3 className="mb-4 font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Chiffre d'affaires
          </h3>
          <div id="stats-overview">
            <StatsOverview stats={stats} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 sm:gap-6">
          <PaymentMethodStats paymentStats={stats.paymentStats} />
          <FeatureGate
            requiredFeature="canAccessAdvancedStats"
            onUpgrade={() => navigate('/abonnements')}
          >
            <ClientRetentionStats />
          </FeatureGate>
        </div>

        <CustomPaymentStats />

        <RevenueChart />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 sm:gap-6">
          <AverageBasketStats />
          <AverageDailyClientsStats />
        </div>

        <EmployeeRevenueStats />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 sm:gap-6">
          <div id="custom-date-range">
            <CustomDateRangeStats />
          </div>
          <FeatureGate
            requiredFeature="canAccessAdvancedStats"
            onUpgrade={() => navigate('/abonnements')}
          >
            <CancellationRateStats />
          </FeatureGate>
        </div>

        <FeatureGate
          requiredFeature="canAccessAdvancedStats"
          onUpgrade={() => navigate('/abonnements')}
        >
          <div id="barber-performance">
            <BarberPerformanceStats />
          </div>
        </FeatureGate>

        <FeatureGate
          requiredFeature="canAccessAdvancedStats"
          onUpgrade={() => navigate('/abonnements')}
        >
          <div id="peak-hours">
            <PeakHoursStats />
          </div>
        </FeatureGate>

        <FeatureGate
          requiredFeature="canAccessAdvancedStats"
          onUpgrade={() => navigate('/abonnements')}
        >
          <div id="service-profitability">
            <ServiceProfitabilityStats />
          </div>
        </FeatureGate>

        <FeatureGate
          requiredFeature="canAccessAdvancedStats"
          onUpgrade={() => navigate('/abonnements')}
        >
          <div id="occupancy-rate">
            <OccupancyRateStats />
          </div>
        </FeatureGate>
      </div>

      <TransactionsManager
        isOpen={isTransactionsManagerOpen}
        onClose={() => setIsTransactionsManagerOpen(false)}
      />
    </MainLayout>
  );
};

export default StatsPage;
