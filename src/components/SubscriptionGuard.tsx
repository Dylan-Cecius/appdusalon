import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSubscriptionRights, type SubscriptionRights } from '@/hooks/useSubscriptionRights';

interface SubscriptionGuardProps {
  children: ReactNode;
  feature: keyof SubscriptionRights;
}

const SubscriptionGuard = ({ children, feature }: SubscriptionGuardProps) => {
  const { canAccess, loading } = useSubscriptionRights();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground">
        Vérification de votre abonnement…
      </div>
    );
  }

  if (!canAccess(feature)) {
    return <Navigate to={`/abonnements?required=${encodeURIComponent(feature)}`} replace />;
  }

  return <>{children}</>;
};

export default SubscriptionGuard;
