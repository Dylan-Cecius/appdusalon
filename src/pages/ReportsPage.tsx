import { useNavigate } from 'react-router-dom';
import { useCombinedStats } from '@/hooks/useCombinedStats';
import MainLayout from '@/components/MainLayout';
import AutomatedReports from '@/components/AutomatedReports';
import EmailReports from '@/components/EmailReports';
import DetailedReportsView from '@/components/DetailedReportsView';
import { FeatureGate } from '@/components/FeatureGate';

const ReportsPage = () => {
  const { stats } = useCombinedStats();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pilotage</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Rapports</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Analysez vos encaissements et transmettez vos rapports sans changer de source comptable.
          </p>
        </div>

        <FeatureGate
          requiredFeature="canExportReports"
          onUpgrade={() => navigate('/abonnements')}
        >
          <DetailedReportsView />
        </FeatureGate>

        <div className="border-t pt-6">
          <h3 className="mb-5 text-xl font-semibold tracking-tight">Envoi et automatisation</h3>
          <div className="space-y-6">
            <FeatureGate
              requiredFeature="canSendEmails"
              onUpgrade={() => navigate('/abonnements')}
            >
              <EmailReports statsData={stats} />
            </FeatureGate>

            <FeatureGate
              requiredFeature="canExportReports"
              onUpgrade={() => navigate('/abonnements')}
            >
              <AutomatedReports />
            </FeatureGate>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
