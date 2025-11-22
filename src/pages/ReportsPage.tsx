import { useCombinedStats } from '@/hooks/useCombinedStats';
import MainLayout from '@/components/MainLayout';
import AutomatedReports from '@/components/AutomatedReports';
import EmailReports from '@/components/EmailReports';

const ReportsPage = () => {
  const { stats } = useCombinedStats();

  return (
    <MainLayout>
      <div className="space-y-6">
        <AutomatedReports />
        <EmailReports statsData={stats} />
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
