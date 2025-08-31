import { useMemo } from 'react';
import { useSubscription } from './useSubscription';

// Définition des droits par type d'abonnement
export interface SubscriptionRights {
  // Limites numériques
  maxBarbers: number;
  maxAppointmentsPerMonth: number;
  maxTransactionsPerMonth: number;
  maxServicesPerBarber: number;
  
  // Fonctionnalités activées
  canAccessAdvancedStats: boolean;
  canExportReports: boolean;
  canSendEmails: boolean;
  canManageInventory: boolean;
  canAccessCustomerPortal: boolean;
  canSetCustomPricing: boolean;
  canAccessMultiSalon: boolean;
  canAccessAPI: boolean;
  canAccessWhiteLabel: boolean;
  
  // Support et formation
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
  hasCustomTraining: boolean;
  
  // Intégrations
  canUseThirdPartyIntegrations: boolean;
  canUseAdvancedBookingFeatures: boolean;
  
  // Branding
  canRemoveBranding: boolean;
  canCustomizeDomain: boolean;
}

// Configuration des droits par type d'abonnement
const SUBSCRIPTION_RIGHTS: Record<string, SubscriptionRights> = {
  // Utilisateur non connecté ou sans abonnement
  'none': {
    maxBarbers: 1,
    maxAppointmentsPerMonth: 50,
    maxTransactionsPerMonth: 50,
    maxServicesPerBarber: 5,
    canAccessAdvancedStats: false,
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
  },

  // Abonnement Basic (7€/mois)
  'Basic': {
    maxBarbers: 2,
    maxAppointmentsPerMonth: 200,
    maxTransactionsPerMonth: 200,
    maxServicesPerBarber: 10,
    canAccessAdvancedStats: true,
    canExportReports: true,
    canSendEmails: false,
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
  },

  // Abonnement Premium (15€/mois)
  'Premium': {
    maxBarbers: 5,
    maxAppointmentsPerMonth: 1000,
    maxTransactionsPerMonth: 1000,
    maxServicesPerBarber: 25,
    canAccessAdvancedStats: true,
    canExportReports: true,
    canSendEmails: true,
    canManageInventory: true,
    canAccessCustomerPortal: true,
    canSetCustomPricing: true,
    canAccessMultiSalon: false,
    canAccessAPI: false,
    canAccessWhiteLabel: false,
    supportLevel: 'priority',
    hasCustomTraining: false,
    canUseThirdPartyIntegrations: true,
    canUseAdvancedBookingFeatures: true,
    canRemoveBranding: true,
    canCustomizeDomain: false,
  },

  // Abonnement Enterprise (39€/mois)
  'Enterprise': {
    maxBarbers: -1, // Illimité
    maxAppointmentsPerMonth: -1, // Illimité
    maxTransactionsPerMonth: -1, // Illimité
    maxServicesPerBarber: -1, // Illimité
    canAccessAdvancedStats: true,
    canExportReports: true,
    canSendEmails: true,
    canManageInventory: true,
    canAccessCustomerPortal: true,
    canSetCustomPricing: true,
    canAccessMultiSalon: true,
    canAccessAPI: true,
    canAccessWhiteLabel: false,
    supportLevel: 'dedicated',
    hasCustomTraining: true,
    canUseThirdPartyIntegrations: true,
    canUseAdvancedBookingFeatures: true,
    canRemoveBranding: true,
    canCustomizeDomain: true,
  },

  // Abonnement à vie (468€ une fois)
  'Lifetime': {
    maxBarbers: -1, // Illimité
    maxAppointmentsPerMonth: -1, // Illimité
    maxTransactionsPerMonth: -1, // Illimité
    maxServicesPerBarber: -1, // Illimité
    canAccessAdvancedStats: true,
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
  },
};

export const useSubscriptionRights = () => {
  const { subscribed, subscription_tier } = useSubscription();

  const rights = useMemo((): SubscriptionRights => {
    // Si pas d'abonnement actif
    if (!subscribed || !subscription_tier) {
      return SUBSCRIPTION_RIGHTS['none'];
    }

    // Retourner les droits correspondant au tier d'abonnement
    return SUBSCRIPTION_RIGHTS[subscription_tier] || SUBSCRIPTION_RIGHTS['none'];
  }, [subscribed, subscription_tier]);

  // Fonctions utilitaires pour vérifier les droits
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

  const getSupportLevel = () => {
    return rights.supportLevel;
  };

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