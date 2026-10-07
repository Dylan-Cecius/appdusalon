export interface SubscriptionRights {
  maxBarbers: number;
  maxAppointmentsPerMonth: number;
  maxTransactionsPerMonth: number;
  maxServicesPerBarber: number;
  canAccessAdvancedStats: boolean;
  canExportReports: boolean;
  canSendEmails: boolean;
  canUseSmsAutomations: boolean;
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

export type SubscriptionTier = 'none' | 'Solo' | 'Equipe' | 'Lifetime';

export const SUBSCRIPTION_RIGHTS: Record<SubscriptionTier, SubscriptionRights> = {
  none: {
    maxBarbers: 1,
    maxAppointmentsPerMonth: -1,
    maxTransactionsPerMonth: -1,
    maxServicesPerBarber: 5,
    canAccessAdvancedStats: false,
    canAccessBasicStats: true,
    canExportReports: false,
    canSendEmails: false,
    canUseSmsAutomations: false,
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
  Solo: {
    maxBarbers: 1,
    maxAppointmentsPerMonth: -1,
    maxTransactionsPerMonth: -1,
    maxServicesPerBarber: -1,
    canAccessAdvancedStats: false,
    canAccessBasicStats: true,
    canExportReports: false,
    canSendEmails: false,
    canUseSmsAutomations: true,
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
  Equipe: {
    maxBarbers: 5,
    maxAppointmentsPerMonth: -1,
    maxTransactionsPerMonth: -1,
    maxServicesPerBarber: -1,
    canAccessAdvancedStats: true,
    canAccessBasicStats: true,
    canExportReports: true,
    canSendEmails: true,
    canUseSmsAutomations: true,
    canManageInventory: true,
    canAccessCustomerPortal: true,
    canSetCustomPricing: true,
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
    canAccessTargetedMarketing: true,
  },
  Lifetime: {
    maxBarbers: -1,
    maxAppointmentsPerMonth: -1,
    maxTransactionsPerMonth: -1,
    maxServicesPerBarber: -1,
    canAccessAdvancedStats: true,
    canAccessBasicStats: true,
    canExportReports: true,
    canSendEmails: true,
    canUseSmsAutomations: true,
    canManageInventory: true,
    canAccessCustomerPortal: true,
    canSetCustomPricing: true,
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
    canAccessTargetedMarketing: true,
  },
};

export const normalizeSubscriptionTier = (
  tier: string | null | undefined
): SubscriptionTier => {
  if (tier === 'Pro') return 'Equipe';
  if (tier === 'Enterprise') return 'Lifetime';
  if (tier === 'Solo' || tier === 'Equipe' || tier === 'Lifetime') return tier;
  return 'none';
};

export const resolveSubscriptionRights = ({
  subscribed,
  tier,
  isDemo = false,
}: {
  subscribed: boolean;
  tier: string | null | undefined;
  isDemo?: boolean;
}): { tier: SubscriptionTier; rights: SubscriptionRights } => {
  if (isDemo) {
    return { tier: 'Lifetime', rights: SUBSCRIPTION_RIGHTS.Lifetime };
  }

  if (!subscribed) {
    return { tier: 'none', rights: SUBSCRIPTION_RIGHTS.none };
  }

  const normalizedTier = normalizeSubscriptionTier(tier);
  return {
    tier: normalizedTier,
    rights: SUBSCRIPTION_RIGHTS[normalizedTier],
  };
};

export const normalizeLimit = (value: number) =>
  value === -1 ? Number.POSITIVE_INFINITY : value;
