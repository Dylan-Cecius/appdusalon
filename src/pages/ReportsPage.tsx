import { useCombinedStats } from '@/hooks/useCombinedStats';
import MainLayout from '@/components/MainLayout';
import AutomatedReports from '@/components/AutomatedReports';
import EmailReports from '@/components/EmailReports';
import DetailedReportsView from '@/components/DetailedReportsView';

const ReportsPage = () => {
  const { stats } = useCombinedStats();

  return (
    <MainLayout>
      <div className="space-y-6">
        <DetailedReportsView />
        <div className="border-t pt-6">
          <h2 className="text-2xl font-bold mb-6">Envoi et Automatisation</h2>
          <div className="space-y-6">
            <EmailReports statsData={stats} />
            <AutomatedReports />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
