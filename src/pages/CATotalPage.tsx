import MainLayout from '@/components/MainLayout';
import TotalRevenueReport from '@/components/TotalRevenueReport';

const CATotalPage = () => {
  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold">CA Total</h2>
        <TotalRevenueReport />
      </div>
    </MainLayout>
  );
};

export default CATotalPage;
