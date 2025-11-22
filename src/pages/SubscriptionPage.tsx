import SubscriptionManagement from '@/components/SubscriptionManagement';
import MainLayout from '@/components/MainLayout';

const SubscriptionPage = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <SubscriptionManagement />
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;
