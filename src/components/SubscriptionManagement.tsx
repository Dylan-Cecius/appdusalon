import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Crown, Check, Users, RefreshCw, Gift, Sparkles, X } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import PromoCodeManagement from './PromoCodeManagement';
import PromoCodeRedemption from './PromoCodeRedemption';
import { useAuth } from '@/hooks/useAuth';

const SubscriptionManagement = () => {
  const { 
    subscribed, 
    subscription_tier, 
    subscription_end, 
    loading,
    checkSubscription,
    createCheckoutSession, 
    openCustomerPortal 
  } = useSubscription();
  
  const { user } = useAuth();
  const canManagePromoCodes = user?.email === 'dylan.cecius@gmail.com';

  const plans = [
    {
      id: 'free',
      name: 'Gratuit',
      price: '0€',
      icon: <Gift className="h-6 w-6" />,
      features: [
        'Rendez-vous illimités',
        'Fiche client basique',
        'Statistiques de base',
        'Caisse (POS) de base',
      ],
      missingFeatures: [
        'Notification SMS/email automatique',
      ],
      color: 'from-gray-400 to-gray-500',
      isFree: true,
    },
    {
      id: 'solo',
      name: 'Solo',
      price: '19€',
      priceNote: 'tarif early adopter',
      icon: <Sparkles className="h-6 w-6" />,
      features: [
        'Rendez-vous illimités',
        'Notifications SMS/email automatiques',
        'Fiche client complète + notes',
        'Statistiques de base',
        'Réservation en ligne / acompte',
      ],
      color: 'from-blue-500 to-blue-600',
      popular: true,
    },
    {
      id: 'equipe',
      name: 'Équipe',
      price: '59€',
      icon: <Users className="h-6 w-6" />,
      features: [
        'Tout ce qui est inclus dans Solo +',
        'Jusqu\'à 5 membres du personnel',
        'Statistiques avancées par employé',
        'Marketing ciblé',
        'Multi-établissements',
        'Rapports exportables',
        'Support prioritaire',
      ],
      color: 'from-purple-500 to-purple-600',
    },
  ];

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const getCurrentTierId = () => {
    if (!subscribed) return 'free';
    if (subscription_tier === 'Solo') return 'solo';
    if (subscription_tier === 'Equipe') return 'equipe';
    if (subscription_tier === 'Lifetime') return 'equipe'; // Lifetime maps to max
    return 'free';
  };

  const currentTierId = getCurrentTierId();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList className={`grid w-full ${canManagePromoCodes ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="subscription">Abonnements</TabsTrigger>
          {canManagePromoCodes && <TabsTrigger value="promo-codes">Codes promo</TabsTrigger>}
          <TabsTrigger value="redeem">Utiliser un code</TabsTrigger>
        </TabsList>

        <TabsContent value="subscription" className="space-y-6">
          {/* Status Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Crown className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-primary">Statut de l'abonnement</h3>
                  <p className="text-sm text-muted-foreground">
                    Gérer votre abonnement L'app du salon
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={checkSubscription}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <Badge variant={subscribed ? "default" : "secondary"} className="text-sm">
                {subscribed ? "✅ Actif" : "Plan Gratuit"}
              </Badge>
              {subscription_tier && (
                <Badge variant="outline" className="text-sm">
                  Plan {subscription_tier}
                </Badge>
              )}
            </div>

            {subscribed && subscription_end && (
              <p className="text-sm text-muted-foreground mb-4">
                Renouvellement le {format(new Date(subscription_end), 'dd MMMM yyyy', { locale: fr })}
              </p>
            )}

            {subscribed && (
              <Button 
                onClick={openCustomerPortal}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Gérer mon abonnement
              </Button>
            )}
          </Card>

          {/* Plans Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = currentTierId === plan.id;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`relative p-6 flex flex-col h-full ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-1">
                        Populaire
                      </Badge>
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-green-500 text-white px-3 py-1">
                        Votre Plan
                      </Badge>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`inline-flex p-3 rounded-full bg-gradient-to-br ${plan.color} text-white mb-4`}>
                      {plan.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <div className="text-3xl font-bold text-primary mb-1">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">/mois</span>
                    </div>
                    {plan.priceNote && (
                      <p className="text-xs text-muted-foreground italic">{plan.priceNote}</p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.isFree ? (
                    <Button
                      disabled={isCurrentPlan}
                      variant="outline"
                      className="w-full"
                    >
                      {isCurrentPlan ? 'Plan Actuel' : 'Plan Gratuit'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => createCheckoutSession(plan.id as 'starter' | 'pro' | 'enterprise')}
                      disabled={isCurrentPlan}
                      className={`w-full ${isCurrentPlan ? 'opacity-50 cursor-not-allowed' : `bg-gradient-to-r ${plan.color} hover:opacity-90`}`}
                    >
                      {isCurrentPlan ? 'Plan Actuel' : `Choisir ${plan.name}`}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          {!subscribed && (
            <Card className="p-6 bg-muted/50">
              <div className="text-center">
                <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Passez à un plan payant</h3>
                <p className="text-muted-foreground mb-4">
                  Débloquez les rendez-vous illimités, les fiches clients complètes et bien plus encore.
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {canManagePromoCodes && (
          <TabsContent value="promo-codes">
            <PromoCodeManagement />
          </TabsContent>
        )}

        <TabsContent value="redeem">
          <PromoCodeRedemption onSuccess={checkSubscription} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubscriptionManagement;
