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
import { AverageBasketStats } from '@/components/stats/AverageBasketStats';
import { EmployeeRevenueStats } from '@/components/stats/EmployeeRevenueStats';
import { AverageDailyClientsStats } from '@/components/stats/AverageDailyClientsStats';
import TransactionsManager from '@/components/TransactionsManager';
import { FeatureGate } from '@/components/FeatureGate';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

const StatsPage = () => {
  const [isTransactionsManagerOpen, setIsTransactionsManagerOpen] = useState(false);
  const { stats } = useCombinedStats();
  const { permissions } = usePermissions();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pilotage</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Statistiques</h2>
            <p className="mt-2 text-sm text-muted-foreground">Analysez le chiffre d’affaires, la fréquentation et les performances du salon.</p>
          </div>
          {permissions.canManageTransactions && (
            <Button
              onClick={() => setIsTransactionsManagerOpen(true)}
              variant="outline"
              className="min-h-[44px] w-full rounded-xl sm:w-auto"
            >
              <DollarSign className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
              <span className="text-sm sm:text-base">Gérer les encaissements</span>
            </Button>
          )}
        </div>

        {/* Raccourcis de navigation */}
        <Card className="v2-panel p-4 sm:p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Accès rapide</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                document
                  .getElementById('stats-overview')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
              className="text-xs min-h-[36px] px-3"
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
              className="text-xs bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 min-h-[36px] px-3"
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
              className="text-xs min-h-[36px] px-3"
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
              className="text-xs min-h-[36px] px-3"
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
              className="text-xs min-h-[36px] px-3"
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
              className="text-xs min-h-[36px] px-3"
            >
              Taux d'occupation
            </Button>
          </div>
        </Card>

        <div id="revenue-section">
          <h3 className="mb-4 text-xl font-semibold tracking-tight">Chiffre d’affaires</h3>
          <StatsOverview stats={stats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <PaymentMethodStats paymentStats={stats.paymentStats} />
          {permissions.isAdmin && (
            <FeatureGate
              requiredFeature="canAccessAdvancedStats"
              onUpgrade={() => navigate('/abonnements')}
            >
              <ClientRetentionStats />
            </FeatureGate>
          )}
        </div>

        <CustomPaymentStats />

        <RevenueChart />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <AverageBasketStats />
          <AverageDailyClientsStats />
        </div>

        {permissions.isAdmin && <EmployeeRevenueStats />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div id="custom-date-range">
            <CustomDateRangeStats />
          </div>
          {permissions.isAdmin && (
            <FeatureGate
              requiredFeature="canAccessAdvancedStats"
              onUpgrade={() => navigate('/abonnements')}
            >
              <CancellationRateStats />
            </FeatureGate>
          )}
        </div>

        {permissions.isAdmin && (
          <>
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
          </>
        )}
      </div>

      <TransactionsManager
        isOpen={isTransactionsManagerOpen}
        onClose={() => setIsTransactionsManagerOpen(false)}
      />
    </MainLayout>
  );
};

export default StatsPage;
