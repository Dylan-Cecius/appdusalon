import { Link } from 'react-router-dom';
import { Crown } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { useSubscriptionRights, SubscriptionRights } from '@/hooks/useSubscriptionRights';

interface GatedPageProps {
  /** Droit requis pour ouvrir la page. */
  feature: keyof SubscriptionRights;
  /** Nom de la fonction, affiché dans le message. */
  title: string;
  /** Formule à partir de laquelle la fonction est incluse. */
  plan: 'Solo' | 'Équipe';
  children: React.ReactNode;
}

/**
 * Verrou de page lié à l'abonnement.
 * Si la formule de l'utilisateur donne accès à la fonction, la page s'affiche
 * normalement ; sinon, un message propose de changer de formule.
 * Tant que les verrous sont éteints (SUBSCRIPTION_GATING_ENABLED = false),
 * tout le monde a accès à tout.
 */
const GatedPage = ({ feature, title, plan, children }: GatedPageProps) => {
  const { canAccess } = useSubscriptionRights();

  if (canAccess(feature)) return <>{children}</>;

  return (
    <MainLayout>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-2xl border border-border bg-card px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Crown className="h-7 w-7" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-muted-foreground">
            Cette fonction est incluse à partir de la formule <strong className="text-foreground">{plan}</strong>.
          </p>
        </div>
        <Button asChild className="min-h-[48px] px-6 text-base">
          <Link to="/abonnement">Voir les formules</Link>
        </Button>
      </div>
    </MainLayout>
  );
};

export default GatedPage;
