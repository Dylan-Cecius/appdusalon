import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
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
import TransactionsManager from '@/components/TransactionsManager';
import { FeatureGate } from '@/components/FeatureGate';
import { useNavigate } from 'react-router-dom';

const StatsPage = () => {
  const [isTransactionsManagerOpen, setIsTransactionsManagerOpen] = useState(false);
  const { stats } = useCombinedStats();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Statistiques & Analyses</h2>
          <Button
            onClick={() => setIsTransactionsManagerOpen(true)}
            variant="outline"
            className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <DollarSign className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
            Gérer les encaissements
          </Button>
        </div>

        {/* Raccourcis de navigation */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
            ACCÈS RAPIDE
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                document
                  .getElementById('stats-overview')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="text-xs"
            >
              Vue d'ensemble
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                document
                  .getElementById('custom-date-range')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="text-xs bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
            >
              CA période personnalisée
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                document
                  .getElementById('barber-performance')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="text-xs"
            >
              Performance coiffeurs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                document
                  .getElementById('peak-hours')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="text-xs"
            >
              Heures de pointe
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                document
                  .getElementById('service-profitability')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="text-xs"
            >
              Rentabilité services
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                document
                  .getElementById('occupancy-rate')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="text-xs"
            >
              Taux d'occupation
            </Button>
          </div>
        </Card>

        <div id="stats-overview">
          <StatsOverview stats={stats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <ServiceProfitabilityStats />
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
