import { useNavigate } from 'react-router-dom';
import SubscriptionManagement from '@/components/SubscriptionManagement';
import { SubscriptionRightsDisplay } from '@/components/SubscriptionRightsDisplay';
import MainLayout from '@/components/MainLayout';

const SubscriptionPage = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Compte</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Abonnement</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Gérez votre formule et voyez précisément ce qu’elle débloque dans L’App du Salon.
          </p>
        </div>

        <SubscriptionManagement />

        <div className="border-t pt-8">
          <SubscriptionRightsDisplay
            showUpgradeButton
            onUpgrade={() => navigate('/abonnements')}
          />
        </div>
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;
