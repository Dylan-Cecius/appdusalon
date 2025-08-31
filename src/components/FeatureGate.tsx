import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import { useSubscriptionRights, SubscriptionRights } from "@/hooks/useSubscriptionRights";

interface FeatureGateProps {
  children: React.ReactNode;
  requiredFeature?: keyof SubscriptionRights;
  requiredLimit?: {
    key: keyof SubscriptionRights;
    current: number;
  };
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  onUpgrade?: () => void;
}

/**
 * Composant pour contrôler l'accès aux fonctionnalités basé sur l'abonnement
 */
export const FeatureGate = ({ 
  children, 
  requiredFeature,
  requiredLimit,
  fallback,
  showUpgradePrompt = true,
  onUpgrade
}: FeatureGateProps) => {
  const { canAccess, isWithinLimit, subscriptionTier } = useSubscriptionRights();

  // Vérifier l'accès à une fonctionnalité
  const hasFeatureAccess = requiredFeature ? canAccess(requiredFeature) : true;
  
  // Vérifier les limites
  const hasLimitAccess = requiredLimit ? isWithinLimit(requiredLimit.current, requiredLimit.key) : true;

  // Si l'utilisateur a accès, afficher le contenu
  if (hasFeatureAccess && hasLimitAccess) {
    return <>{children}</>;
  }

  // Si un fallback personnalisé est fourni
  if (fallback) {
    return <>{fallback}</>;
  }

  // Affichage par défaut quand l'accès est refusé
  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
      <CardContent className="p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-3 rounded-full bg-primary/10">
            {subscriptionTier === 'none' ? (
              <Lock className="h-6 w-6 text-primary" />
            ) : (
              <Crown className="h-6 w-6 text-primary" />
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">
            {subscriptionTier === 'none' ? 'Fonctionnalité Premium' : 'Mise à niveau requise'}
          </h3>
          
          <p className="text-muted-foreground text-sm">
            {!hasFeatureAccess && requiredFeature && (
              <>Cette fonctionnalité nécessite un abonnement supérieur.</>
            )}
            {!hasLimitAccess && requiredLimit && (
              <>Vous avez atteint la limite de votre plan actuel ({requiredLimit.current} utilisés).</>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onUpgrade}
          >
            {subscriptionTier === 'none' ? 'Découvrir les plans' : 'Mettre à niveau'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Hook pour utiliser FeatureGate de manière conditionnelle
 */
export const useFeatureAccess = () => {
  const { canAccess, isWithinLimit, subscriptionTier, rights } = useSubscriptionRights();

  const checkFeature = (feature: keyof SubscriptionRights) => {
    return canAccess(feature);
  };

  const checkLimit = (current: number, limitKey: keyof SubscriptionRights) => {
    return isWithinLimit(current, limitKey);
  };

  const requiresUpgrade = (feature?: keyof SubscriptionRights, limit?: { key: keyof SubscriptionRights; current: number }) => {
    const hasFeature = feature ? canAccess(feature) : true;
    const hasLimit = limit ? isWithinLimit(limit.current, limit.key) : true;
    return !hasFeature || !hasLimit;
  };

  return {
    checkFeature,
    checkLimit,
    requiresUpgrade,
    subscriptionTier,
    rights
  };
};