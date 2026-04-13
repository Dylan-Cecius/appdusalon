import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
}

// Session-level cache shared across all hook instances
const subscriptionCache: {
  data: SubscriptionData | null;
  lastChecked: number;
  userId: string | null;
  pending: Promise<SubscriptionData | null> | null;
} = {
  data: null,
  lastChecked: 0,
  userId: null,
  pending: null,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const useSubscription = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>(
    subscriptionCache.data ?? { subscribed: false, subscription_tier: null, subscription_end: null }
  );
  const [loading, setLoading] = useState(!subscriptionCache.data);
  const { user } = useAuth();
  const { toast } = useToast();
  const mountedRef = useRef(true);

  const checkSubscription = async (force = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    const now = Date.now();

    // If user changed, invalidate cache
    if (subscriptionCache.userId !== user.id) {
      subscriptionCache.data = null;
      subscriptionCache.lastChecked = 0;
      subscriptionCache.userId = user.id;
      subscriptionCache.pending = null;
    }

    // Return cached data if still fresh
    if (!force && subscriptionCache.data && (now - subscriptionCache.lastChecked < CACHE_TTL_MS)) {
      if (mountedRef.current) {
        setSubscriptionData(subscriptionCache.data);
        setLoading(false);
      }
      return;
    }

    // Deduplicate concurrent calls
    if (subscriptionCache.pending) {
      try {
        const result = await subscriptionCache.pending;
        if (mountedRef.current && result) {
          setSubscriptionData(result);
          setLoading(false);
        }
      } catch {
        if (mountedRef.current) setLoading(false);
      }
      return;
    }

    const fetchPromise = (async (): Promise<SubscriptionData | null> => {
      try {
        const { data, error } = await supabase.functions.invoke('check-subscription');
        if (error) {
          console.warn('Subscription check failed (non-blocking):', error.message);
          return null;
        }
        return data as SubscriptionData;
      } catch (error) {
        console.warn('Subscription check failed (non-blocking):', error);
        return null;
      }
    })();

    subscriptionCache.pending = fetchPromise;

    try {
      const result = await fetchPromise;
      if (result) {
        subscriptionCache.data = result;
        subscriptionCache.lastChecked = Date.now();
        if (mountedRef.current) {
          setSubscriptionData(result);
        }
      }
    } finally {
      subscriptionCache.pending = null;
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
    checkSubscription();
    return () => { mountedRef.current = false; };
  }, [user]);

  return {
    ...subscriptionData,
    loading,
    checkSubscription: () => checkSubscription(true),
    createCheckoutSession,
    openCustomerPortal
  };
};
