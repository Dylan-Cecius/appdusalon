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
}

const SUBSCRIPTION_RIGHTS: Record<string, SubscriptionRights> = {
  // Plan Gratuit (0€/mois)
  'none': {
    maxBarbers: 1,
    maxAppointmentsPerMonth: 50,
    maxTransactionsPerMonth: 50,
    maxServicesPerBarber: 5,
    canAccessAdvancedStats: false,
    canAccessBasicStats: false,
    canExportReports: false,
    canSendEmails: true, // Notifications auto basiques
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
  },

  // Plan Solo (19€/mois)
  'Solo': {
    maxBarbers: 1,
    maxAppointmentsPerMonth: -1, // Illimité
    maxTransactionsPerMonth: -1,
    maxServicesPerBarber: -1,
    canAccessAdvancedStats: false,
    canAccessBasicStats: true,
    canExportReports: false,
    canSendEmails: true,
    canManageInventory: false,
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
  },

  // Plan Équipe (59€/mois)
  'Equipe': {
    maxBarbers: 5,
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
  },
};

export const useSubscriptionRights = () => {
  const { subscribed, subscription_tier } = useSubscription();
  const { user } = useAuth();

  const isDemo = user?.email === 'demo@appdusalon.com';

  const rights = useMemo((): SubscriptionRights => {
    if (!user) return SUBSCRIPTION_RIGHTS['none'];
    if (isDemo) return SUBSCRIPTION_RIGHTS['Equipe'];
    if (!subscribed || !subscription_tier) return SUBSCRIPTION_RIGHTS['none'];
    return SUBSCRIPTION_RIGHTS[subscription_tier] || SUBSCRIPTION_RIGHTS['none'];
  }, [user, subscribed, subscription_tier, isDemo]);

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
