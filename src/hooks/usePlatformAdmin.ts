import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const usePlatformAdmin = () => {
  const { user, isReady } = useAuth();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (!isReady) return;

      if (!user) {
        if (!cancelled) {
          setIsPlatformAdmin(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await (supabase as any).rpc('is_platform_admin');
        if (error) throw error;

        if (!cancelled) {
          setIsPlatformAdmin(data === true);
        }
      } catch (error) {
        console.error('[PlatformAdmin] authorization check failed', error);
        if (!cancelled) setIsPlatformAdmin(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void check();

    return () => {
      cancelled = true;
    };
  }, [isReady, user?.id]);

  return { isPlatformAdmin, loading };
};
