import { useState } from 'react';
import { useCombinedStats } from '@/hooks/useCombinedStats';
import MainLayout from '@/components/MainLayout';
import AutomatedReports from '@/components/AutomatedReports';
import EmailReports from '@/components/EmailReports';
import DetailedReportsView from '@/components/DetailedReportsView';
import TotalRevenueReport from '@/components/TotalRevenueReport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ReportsPage = () => {
  const { stats } = useCombinedStats();

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        <Tabs defaultValue="total" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="total">CA Total</TabsTrigger>
            <TabsTrigger value="detailed">Rapports Détaillés</TabsTrigger>
          </TabsList>
          <TabsContent value="total">
            <TotalRevenueReport />
          </TabsContent>
          <TabsContent value="detailed">
            <DetailedReportsView />
          </TabsContent>
        </Tabs>
        <div className="border-t pt-4 sm:pt-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Envoi et Automatisation</h2>
          <div className="space-y-4 sm:space-y-6">
            <EmailReports statsData={stats} />
            <AutomatedReports />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
