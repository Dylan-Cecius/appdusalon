import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

const DEFAULT_SUBSCRIPTION_DATA: SubscriptionData = {
  subscribed: false,
  subscription_tier: null,
  subscription_end: null,
};

const cloneSubscriptionData = (data: SubscriptionData): SubscriptionData => ({ ...data });

// Session-level cache shared across all hook instances
const subscriptionCache: {
  data: SubscriptionData | null;
  lastChecked: number;
  lastFailed: number;
  userId: string | null;
  pending: Promise<SubscriptionData> | null;
} = {
  data: null,
  lastChecked: 0,
  lastFailed: 0,
  userId: null,
  pending: null,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const FAILURE_RETRY_TTL_MS = 60 * 1000; // 1 minute cooldown after a failed fetch

const resetSubscriptionCache = (userId: string | null = null) => {
  subscriptionCache.data = null;
  subscriptionCache.lastChecked = 0;
  subscriptionCache.lastFailed = 0;
  subscriptionCache.userId = userId;
  subscriptionCache.pending = null;
};

export const useSubscription = () => {
  const { user, isReady } = useAuth();
  const { toast } = useToast();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>(() => {
    if (user && subscriptionCache.userId === user.id && subscriptionCache.data) {
      return cloneSubscriptionData(subscriptionCache.data);
    }

    return cloneSubscriptionData(DEFAULT_SUBSCRIPTION_DATA);
  });
  const [loading, setLoading] = useState(
    Boolean(user) && (Boolean(subscriptionCache.pending) || (!subscriptionCache.data && !subscriptionCache.lastFailed))
  );
  const mountedRef = useRef(true);

  const checkSubscription = async (force = false) => {
    if (!isReady) {
      if (mountedRef.current) {
        setLoading(true);
      }
      return;
    }

    if (!user) {
      resetSubscriptionCache(null);
      if (mountedRef.current) {
        setSubscriptionData(cloneSubscriptionData(DEFAULT_SUBSCRIPTION_DATA));
        setLoading(false);
      }
      return;
    }

    const requestUserId = user.id;
    const now = Date.now();

    // If user changed, invalidate cache
    if (subscriptionCache.userId !== requestUserId) {
      resetSubscriptionCache(requestUserId);
      if (mountedRef.current) {
        setSubscriptionData(cloneSubscriptionData(DEFAULT_SUBSCRIPTION_DATA));
      }
    }

    // Return cached data if still fresh
    if (!force && subscriptionCache.data && (now - subscriptionCache.lastChecked < CACHE_TTL_MS)) {
      if (mountedRef.current) {
        setSubscriptionData(cloneSubscriptionData(subscriptionCache.data));
        setLoading(false);
      }
      return;
    }

    // Reuse fallback data briefly after a failed request to avoid retry storms
    if (!force && subscriptionCache.lastFailed && (now - subscriptionCache.lastFailed < FAILURE_RETRY_TTL_MS)) {
      if (mountedRef.current) {
        setSubscriptionData(cloneSubscriptionData(subscriptionCache.data ?? DEFAULT_SUBSCRIPTION_DATA));
        setLoading(false);
      }
      return;
    }

    // Deduplicate concurrent calls
    if (subscriptionCache.pending) {
      if (mountedRef.current) {
        setLoading(true);
      }
      try {
        const result = await subscriptionCache.pending;
        if (mountedRef.current && subscriptionCache.userId === requestUserId) {
          setSubscriptionData(cloneSubscriptionData(result));
          setLoading(false);
        }
      } catch {
        if (mountedRef.current) setLoading(false);
      }
      return;
    }

    if (mountedRef.current) {
      setLoading(true);
    }

    const fetchPromise = (async (): Promise<SubscriptionData> => {
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription');
        if (error) {
          throw error;
        }

        const result = cloneSubscriptionData((data as SubscriptionData | null) ?? DEFAULT_SUBSCRIPTION_DATA);

        if (subscriptionCache.userId === requestUserId) {
          subscriptionCache.data = result;
          subscriptionCache.lastChecked = Date.now();
          subscriptionCache.lastFailed = 0;
        }

        return result;
      } catch (error) {
        console.warn('Subscription check failed (cached fallback):', error);

        const fallbackData = cloneSubscriptionData(subscriptionCache.data ?? DEFAULT_SUBSCRIPTION_DATA);

        if (subscriptionCache.userId === requestUserId) {
          subscriptionCache.data = fallbackData;
          subscriptionCache.lastChecked = 0;
          subscriptionCache.lastFailed = Date.now();
        }

        return fallbackData;
      }
    })();

    subscriptionCache.pending = fetchPromise;

    try {
      const result = await fetchPromise;
      if (mountedRef.current && subscriptionCache.userId === requestUserId) {
        setSubscriptionData(cloneSubscriptionData(result));
      }
    } finally {
      if (subscriptionCache.userId === requestUserId) {
        subscriptionCache.pending = null;
      }

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const createCheckoutSession = async (plan: 'starter' | 'pro' | 'enterprise') => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour souscrire un abonnement",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan }
      });

      if (error) {
        console.error('Error creating checkout session:', error);
        toast({
          title: "Erreur",
          description: "Impossible de créer la session de paiement",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la création de la session de paiement",
        variant: "destructive",
      });
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour gérer votre abonnement",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) {
        console.error('Error opening customer portal:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'ouvrir le portail client",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'ouverture du portail client",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    if (!isReady) {
      setLoading(true);
      return () => { mountedRef.current = false; };
    }

    console.log('[Subscription] effect trigger', { userId: user?.id ?? null });
    void checkSubscription();

    return () => { mountedRef.current = false; };
  }, [isReady, user?.id]);

  return {
    ...subscriptionData,
    loading,
    checkSubscription: () => checkSubscription(true),
    createCheckoutSession,
    openCustomerPortal
  };
};
