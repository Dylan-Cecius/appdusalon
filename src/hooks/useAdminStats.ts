import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  usedPromoCodes: number;
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
  loading: boolean;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    usedPromoCodes: 0,
    recentActivity: [],
    loading: true,
  });

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setStats(prev => ({ ...prev, loading: true }));

      // Récupérer le nombre total d'utilisateurs depuis la table profiles
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Récupérer le nombre d'abonnements actifs
      const { count: activeSubscriptions } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('subscribed', true);

      // Récupérer le nombre de codes promo utilisés
      const { count: usedPromoCodes } = await supabase
        .from('promo_code_usage')
        .select('*', { count: 'exact', head: true });

      // Récupérer l'activité récente
      const { data: recentProfiles } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentSubscribers } = await supabase
        .from('subscribers')
        .select('created_at, subscription_tier')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentPromoUsage } = await supabase
        .from('promo_code_usage')
        .select('used_at')
        .order('used_at', { ascending: false })
        .limit(5);

      // Créer l'activité récente
      const recentActivity = [];

      // Ajouter les nouveaux utilisateurs
      if (recentProfiles) {
        recentProfiles.forEach(profile => {
          recentActivity.push({
            type: 'user_registered',
            message: 'Nouvel utilisateur inscrit',
            timestamp: profile.created_at,
          });
        });
      }

      // Ajouter les nouveaux abonnements
      if (recentSubscribers) {
        recentSubscribers.forEach(sub => {
          recentActivity.push({
            type: 'subscription_activated',
            message: `Abonnement ${sub.subscription_tier} activé`,
            timestamp: sub.created_at,
          });
        });
      }

      // Ajouter l'utilisation des codes promo
      if (recentPromoUsage) {
        recentPromoUsage.forEach(usage => {
          recentActivity.push({
            type: 'promo_used',
            message: 'Code promo utilisé',
            timestamp: usage.used_at,
          });
        });
      }

      // Trier par timestamp et prendre les 10 plus récents
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const sortedActivity = recentActivity.slice(0, 10).map(activity => ({
        ...activity,
        timestamp: formatTimeAgo(activity.timestamp),
      }));

      setStats({
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        usedPromoCodes: usedPromoCodes || 0,
        recentActivity: sortedActivity,
        loading: false,
      });

    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques admin:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  };

  return { stats, refreshStats: fetchAdminStats };
};