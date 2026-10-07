import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { useAuth } from './useAuth';
import {
  normalizeLimit,
  resolveSubscriptionRights,
  type SubscriptionRights,
} from '@/lib/subscriptionRights';

export type { SubscriptionRights } from '@/lib/subscriptionRights';

export const useSubscriptionRights = () => {
  const { subscribed, subscription_tier, loading } = useSubscription();
  const { user } = useAuth();

  const isDemo = user?.email === 'demo@appdusalon.com';

  const resolved = useMemo(
    () =>
      resolveSubscriptionRights({
        subscribed,
        tier: subscription_tier,
        isDemo,
      }),
    [isDemo, subscribed, subscription_tier]
  );

  const rights = resolved.rights;

  const canAccess = (feature: keyof SubscriptionRights) => {
    return rights[feature] as boolean;
  };

  const getLimit = (limit: keyof SubscriptionRights) => {
    return normalizeLimit(rights[limit] as number);
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
    loading,
    subscriptionTier: resolved.tier,
    canAccess,
    getLimit,
    isWithinLimit,
    getRemainingUsage,
    getSupportLevel,
  };
};
