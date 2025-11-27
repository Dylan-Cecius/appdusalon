import { useCombinedStats } from '@/hooks/useCombinedStats';
import MainLayout from '@/components/MainLayout';
import AutomatedReports from '@/components/AutomatedReports';
import EmailReports from '@/components/EmailReports';
import DetailedReportsView from '@/components/DetailedReportsView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ReportsPage = () => {
  const { stats } = useCombinedStats();

  return (
    <MainLayout>
      <Tabs defaultValue="detailed" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="detailed">Rapports Détaillés</TabsTrigger>
          <TabsTrigger value="automated">Automatisation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="detailed" className="space-y-6">
          <DetailedReportsView />
        </TabsContent>
        
        <TabsContent value="automated" className="space-y-6">
          <AutomatedReports />
          <EmailReports statsData={stats} />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default ReportsPage;
