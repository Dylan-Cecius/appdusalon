import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useSalonDemo = () => {
  const { user } = useAuth();
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsDemo(false);
      setLoading(false);
      return;
    }

    const checkDemo = async () => {
      try {
        const { data: salonId } = await supabase.rpc('get_user_salon_id', { 
          _user_id: user.id 
        });

        if (!salonId) {
          setIsDemo(false);
          setLoading(false);
          return;
        }

        const { data: salon } = await supabase
          .from('salons')
          .select('is_demo')
          .eq('id', salonId)
          .single();

        setIsDemo(salon?.is_demo ?? false);
      } catch (error) {
        console.error('Error checking demo mode:', error);
        setIsDemo(false);
      } finally {
        setLoading(false);
      }
    };

    checkDemo();
  }, [user]);

  return { isDemo, loading };
};
