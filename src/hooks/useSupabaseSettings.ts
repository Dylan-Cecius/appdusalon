import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface SalonSettings {
  id?: string;
  name: string;
  logo_url?: string;
  stats_password?: string | null;
  has_stats_password?: boolean;
  user_id?: string;
  salon_id?: string;
  slug?: string;
}

export const useSupabaseSettings = () => {
  const { user, isReady } = useAuth();
  const [salonSettings, setSalonSettings] = useState<SalonSettings | null>({
    name: "L'app du salon",
    logo_url: '',
    has_stats_password: false
  });
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: salonId, error: salonIdError } = await supabase.rpc('get_user_salon_id', {
        _user_id: user.id,
      });

      if (salonIdError) throw salonIdError;

      const [salonResult, settingsResult, passwordResult] = await Promise.all([
        salonId
          ? supabase
              .from('salons')
              .select('id, name, owner_user_id, slug')
              .eq('id', salonId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        salonId
          ? supabase
              .from('salon_settings')
              .select('id, name, logo_url, user_id, salon_id')
              .eq('salon_id', salonId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        (supabase as any).rpc('has_stats_password'),
      ]);

      if (salonResult.error) throw salonResult.error;
      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
        throw settingsResult.error;
      }

      const settings = settingsResult.data;
      const salon = salonResult.data;

      setSalonSettings({
        id: settings?.id,
        name: salon?.name || settings?.name || 'Mon Salon',
        logo_url: settings?.logo_url || '',
        user_id: salon?.owner_user_id || settings?.user_id || user.id,
        salon_id: salon?.id || settings?.salon_id || undefined,
        slug: salon?.slug || undefined,
        has_stats_password: passwordResult.data === true,
      });
    } catch (error) {
      console.error('Error fetching salon settings:', error);
      setSalonSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const saveSalonSettings = async (settings: SalonSettings) => {
    if (!user) {
      throw new Error('Vous devez être connecté pour sauvegarder');
    }

    const cleanName = settings.name.trim();
    if (!cleanName) {
      throw new Error('Le nom du salon est requis');
    }

    try {
      const { data: salonId, error: salonIdError } = await supabase.rpc('get_user_salon_id', {
        _user_id: user.id,
      });

      if (salonIdError) throw salonIdError;
      if (!salonId) throw new Error('Salon introuvable');

      const { error: salonUpdateError } = await supabase
        .from('salons')
        .update({ name: cleanName })
        .eq('id', salonId);

      if (salonUpdateError) throw salonUpdateError;

      const dataToUpsert = {
        id: salonSettings?.id || settings.id,
        name: cleanName,
        logo_url: settings.logo_url || '',
        user_id: salonSettings?.user_id || user.id,
        salon_id: salonId,
      };

      const { data, error } = await supabase
        .from('salon_settings')
        .upsert(dataToUpsert)
        .select('id, name, logo_url, user_id, salon_id')
        .single();

      if (error) throw error;

      const { data: hasPassword, error: passwordError } = await (supabase as any).rpc('has_stats_password');
      if (passwordError) throw passwordError;

      setSalonSettings({
        id: data.id,
        name: cleanName,
        logo_url: data.logo_url,
        user_id: data.user_id,
        salon_id: data.salon_id,
        slug: salonSettings?.slug,
        has_stats_password: hasPassword === true,
      });

      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  // Gate data fetching on auth readiness
  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      setSalonSettings(null);
      setLoading(false);
      userIdRef.current = null;
      return;
    }

    if (userIdRef.current === user.id) return;
    userIdRef.current = user.id;

    fetchSettings();
  }, [isReady, user?.id]);

  return {
    salonSettings,
    loading,
    saveSalonSettings,
  };
};
