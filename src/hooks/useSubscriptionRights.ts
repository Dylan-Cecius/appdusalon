import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { useAuth } from './useAuth';

export interface SubscriptionRights {
  maxBarbers: number;
  maxAppointmentsPerMonth: number;
  maxTransactionsPerMonth: number;
  maxServicesPerBarber: number;
  canAccessAdvancedStats: boolean;
  canExportReports: boolean;
  canSendEmails: boolean;
  canManageInventory: boolean;
  canAccessCustomerPortal: boolean;
  canSetCustomPricing: boolean;
  canAccessMultiSalon: boolean;
  canAccessAPI: boolean;
  canAccessWhiteLabel: boolean;
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
  hasCustomTraining: boolean;
  canUseThirdPartyIntegrations: boolean;
  canUseAdvancedBookingFeatures: boolean;
  canRemoveBranding: boolean;
  canCustomizeDomain: boolean;
  canAccessFullClientNotes: boolean;
  canAccessOnlineBooking: boolean;
  canAccessTargetedMarketing: boolean;
  canAccessBasicStats: boolean;
  canUseAutomatedReports: boolean;
}

// --- Interrupteurs de mise en service des abonnements -----------------------
// Tant que SUBSCRIPTION_GATING_ENABLED est à false, toutes les fonctions restent
// ouvertes à tout le monde (comportement actuel du site) : personne n'est bloqué.
// À passer à true seulement quand Stripe est en mode réel.
export const SUBSCRIPTION_GATING_ENABLED = false;
// Tant que SUBSCRIPTIONS_PUBLIC est à false, la page Abonnement n'apparaît dans le
// menu que pour le propriétaire de l'app et le compte démo (phase de test).
export const SUBSCRIPTIONS_PUBLIC = false;
const OWNER_EMAILS = ['dylan.cecius@gmail.com', 'demo@appdusalon.com'];

export const canSeeSubscriptions = (email?: string | null) =>
  SUBSCRIPTIONS_PUBLIC || (!!email && OWNER_EMAILS.includes(email));

const SUBSCRIPTION_RIGHTS: Record<string, SubscriptionRights> = {
  // Plan Gratuit (0€/mois)
  'none': {
    maxBarbers: 1,
    maxAppointmentsPerMonth: -1,
    maxTransactionsPerMonth: -1,
    maxServicesPerBarber: 5,
    canAccessAdvancedStats: false,
    canAccessBasicStats: true,
    canExportReports: false,
    canSendEmails: false,
    canManageInventory: false,
    canAccessCustomerPortal: false,
    canSetCustomPricing: false,
    canAccessMultiSalon: false,
    canAccessAPI: false,
    canAccessWhiteLabel: false,
    supportLevel: 'community',
    hasCustomTraining: false,
    canUseThirdPartyIntegrations: false,
    canUseAdvancedBookingFeatures: false,
    canRemoveBranding: false,
    canCustomizeDomain: false,
    canAccessFullClientNotes: false,
    canAccessOnlineBooking: false,
    canAccessTargetedMarketing: false,
    canUseAutomatedReports: false,
  },

  // Plan Solo (19€/mois)
  'Solo': {
    maxBarbers: 1,
    maxAppointmentsPerMonth: -1, // Illimité
    maxTransactionsPerMonth: -1,
    maxServicesPerBarber: -1,
    canAccessAdvancedStats: false,
    canAccessBasicStats: true,
    canExportReports: true,
    canSendEmails: true,
    canManageInventory: true,
    canAccessCustomerPortal: false,
    canSetCustomPricing: false,
    canAccessMultiSalon: false,
    canAccessAPI: false,
    canAccessWhiteLabel: false,
    supportLevel: 'email',
    hasCustomTraining: false,
    canUseThirdPartyIntegrations: false,
    canUseAdvancedBookingFeatures: true,
    canRemoveBranding: false,
    canCustomizeDomain: false,
    canAccessFullClientNotes: true,
    canAccessOnlineBooking: true,
    canAccessTargetedMarketing: false,
    canUseAutomatedReports: false,
  },

  // Plan Équipe (59€/mois)
  'Equipe': {
    maxBarbers: -1, // équipe illimitée
    maxAppointmentsPerMonth: -1,
    maxTransactionsPerMonth: -1,
    maxServicesPerBarber: -1,
    canAccessAdvancedStats: true,
    canAccessBasicStats: true,
    canExportReports: true,
    canSendEmails: true,
    canManageInventory: true,
    canAccessCustomerPortal: true,
    canSetCustomPricing: true,
    canAccessMultiSalon: true,
    canAccessAPI: false,
    canAccessWhiteLabel: false,
    supportLevel: 'priority',
    hasCustomTraining: false,
    canUseThirdPartyIntegrations: true,
    canUseAdvancedBookingFeatures: true,
    canRemoveBranding: true,
    canCustomizeDomain: false,
    canAccessFullClientNotes: true,
    canAccessOnlineBooking: true,
    canAccessTargetedMarketing: true,
    canUseAutomatedReports: true,
  },

  // Accès à vie (legacy / promo)
  'Lifetime': {
    maxBarbers: -1,
    maxAppointmentsPerMonth: -1,
    maxTransactionsPerMonth: -1,
    maxServicesPerBarber: -1,
    canAccessAdvancedStats: true,
    canAccessBasicStats: true,
    canExportReports: true,
    canSendEmails: true,
    canManageInventory: true,
    canAccessCustomerPortal: true,
    canSetCustomPricing: true,
    canAccessMultiSalon: true,
    canAccessAPI: true,
    canAccessWhiteLabel: true,
    supportLevel: 'priority',
    hasCustomTraining: true,
    canUseThirdPartyIntegrations: true,
    canUseAdvancedBookingFeatures: true,
    canRemoveBranding: true,
    canCustomizeDomain: true,
    canAccessFullClientNotes: true,
    canAccessOnlineBooking: true,
    canAccessTargetedMarketing: true,
    canUseAutomatedReports: true,
  },
};

export const useSubscriptionRights = () => {
  const { subscribed, subscription_tier } = useSubscription();
  const { user } = useAuth();

  const isDemo = user?.email === 'demo@appdusalon.com';

  const rights = useMemo((): SubscriptionRights => {
    // Verrous désactivés, ou compte démo : tout est ouvert
    if (!SUBSCRIPTION_GATING_ENABLED || isDemo) return SUBSCRIPTION_RIGHTS['Lifetime'];
    const tier = subscribed && subscription_tier ? subscription_tier : 'none';
    return SUBSCRIPTION_RIGHTS[tier] ?? SUBSCRIPTION_RIGHTS['none'];
  }, [subscribed, subscription_tier, isDemo]);

  const canAccess = (feature: keyof SubscriptionRights) => {
    return rights[feature] as boolean;
  };

  const getLimit = (limit: keyof SubscriptionRights) => {
    const value = rights[limit] as number;
    return value === -1 ? Infinity : value;
  };

  const isWithinLimit = (currentCount: number, limitKey: keyof SubscriptionRights) => {
    const limit = getLimit(limitKey);
    return limit === Infinity || currentCount < limit;
  };

  const getRemainingUsage = (currentCount: number, limitKey: keyof SubscriptionRights) => {
    const limit = getLimit(limitKey);
    if (limit === Infinity) return Infinity;
    return Math.max(0, limit - currentCount);
  };

  const getSupportLevel = () => rights.supportLevel;

  return {
    rights,
    subscriptionTier: subscription_tier || 'none',
    canAccess,
    getLimit,
    isWithinLimit,
    getRemainingUsage,
    getSupportLevel,
  };
};
