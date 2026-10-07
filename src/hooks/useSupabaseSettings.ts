import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface SalonSettings {
  id?: string;
  name: string;
  logo_url?: string;
  stats_password?: string | null;
  has_stats_password?: boolean;
  user_id?: string;
  salon_id?: string;
}

export interface Barber {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  color: string;
  user_id?: string;
  working_days?: string[];
}

export const useSupabaseSettings = () => {
  const { user, isReady } = useAuth();
  const [salonSettings, setSalonSettings] = useState<SalonSettings | null>({
    name: "L'app du salon",
    logo_url: '',
    has_stats_password: false
  });
  const [barbers, setBarbers] = useState<Barber[]>([]);
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
              .select('id, name, owner_user_id')
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
        has_stats_password: passwordResult.data === true,
      });
    } catch (error) {
      console.error('Error fetching salon settings:', error);
      setSalonSettings(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchBarbers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching barbers:', error);
        return;
      }

      if (data) {
        setBarbers(data.map(barber => ({
          ...barber,
          working_days: barber.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        })));
      }
    } catch (error) {
      console.error('Error:', error);
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
        has_stats_password: hasPassword === true,
      });

      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  const addBarber = async (barber: Omit<Barber, 'id'>) => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive"
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('barbers')
        .insert({
          ...barber,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding barber:', error);
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter le coiffeur",
          variant: "destructive"
        });
        return null;
      }

      setBarbers(prev => [...prev, data]);
      toast({
        title: "Succès",
        description: `Coiffeur ${data.name} ajouté avec succès`
      });
      
      return data;
    } catch (error) {
      console.error('Error adding barber:', error);
      return null;
    }
  };

  const updateBarber = async (id: string, updates: Partial<Barber>) => {
    try {
      const { data, error } = await supabase
        .from('barbers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le coiffeur",
          variant: "destructive"
        });
        return;
      }

      setBarbers(prev => prev.map(b => b.id === id ? data : b));
      toast({
        title: "Succès",
        description: "Coiffeur mis à jour avec succès"
      });
    } catch (error) {
      console.error('Error updating barber:', error);
    }
  };

  const deleteBarber = async (id: string) => {
    try {
      const { error } = await supabase
        .from('barbers')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le coiffeur",
          variant: "destructive"
        });
        return;
      }

      const deletedBarber = barbers.find(b => b.id === id);
      setBarbers(prev => prev.filter(b => b.id !== id));
      toast({
        title: "Succès",
        description: `Coiffeur ${deletedBarber?.name} supprimé avec succès`
      });
    } catch (error) {
      console.error('Error deleting barber:', error);
    }
  };

  // Gate data fetching on auth readiness
  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      setSalonSettings(null);
      setBarbers([]);
      setLoading(false);
      userIdRef.current = null;
      return;
    }

    if (userIdRef.current === user.id) return;
    userIdRef.current = user.id;

    fetchSettings();
    fetchBarbers();
  }, [isReady, user?.id]);

  return {
    salonSettings,
    barbers,
    loading,
    saveSalonSettings,
    addBarber,
    updateBarber,
    deleteBarber
  };
};
