import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface SalonSettings {
  id?: string;
  name: string;
  logo_url?: string;
  stats_password?: string;
  user_id?: string;
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
    stats_password: ''
  });
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const fetchSettings = async () => {
    if (!user) return;
    console.log('[Settings] fetch start');
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('salon_settings')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching salon settings:', error);
        return;
      }

      if (data) {
        console.log('[Settings] fetched:', data.id, data.name);
        setSalonSettings({
          id: data.id,
          name: data.name,
          logo_url: data.logo_url,
          stats_password: data.stats_password,
          user_id: data.user_id
        });
      } else {
        setSalonSettings(null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBarbers = async () => {
    if (!user) return;
    console.log('[Barbers] fetch start');

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
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour sauvegarder",
        variant: "destructive"
      });
      return;
    }

    try {
      const dataToUpsert = {
        ...settings,
        user_id: user.id,
        id: salonSettings?.id || settings.id
      };

      const { data, error } = await supabase
        .from('salon_settings')
        .upsert(dataToUpsert)
        .select()
        .single();

      if (error) {
        console.error('Error saving settings:', error);
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder les paramètres",
          variant: "destructive"
        });
        return;
      }

      setSalonSettings({
        id: data.id,
        name: data.name,
        logo_url: data.logo_url,
        stats_password: data.stats_password,
        user_id: data.user_id
      });
      
      toast({
        title: "Succès",
        description: "Paramètres du salon sauvegardés"
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
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

    console.log('[Settings] effect trigger — fetching for user', user.id);
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
