import MainLayout from '@/components/MainLayout';
import TotalRevenueReport from '@/components/TotalRevenueReport';

const CATotalPage = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Finance</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Chiffre d’affaires</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Suivez les encaissements consolidés du salon et leur évolution dans le temps.
          </p>
        </div>
        <div className="v2-panel overflow-hidden p-1 sm:p-2">
          <TotalRevenueReport />
        </div>
      </div>
    </MainLayout>
  );
};

export default CATotalPage;
