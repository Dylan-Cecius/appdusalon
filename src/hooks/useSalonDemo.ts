import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useSalonDemo = () => {
  const { user } = useAuth();
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsDemo(false);
      return;
    }

    const checkDemo = async () => {
      try {
        const { data: salonId } = await supabase.rpc('get_user_salon_id', { 
          _user_id: user.id 
        });

        if (!salonId) {
          setIsDemo(false);
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
      }
    };

    checkDemo();
  }, [user]);

  return { isDemo };
};
