import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  const [salonSettings, setSalonSettings] = useState<SalonSettings>({
    name: "L'app du salon",
    logo_url: '',
    stats_password: ''
  });
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Récupérer le plus récent enregistrement au lieu du premier
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
        console.log('🔍 [DEBUG] Fetched settings:', { 
          id: data.id, 
          name: data.name, 
          has_password: !!data.stats_password,
          updated_at: data.updated_at
        });
        setSalonSettings({
          id: data.id,
          name: data.name,
          logo_url: data.logo_url,
          stats_password: data.stats_password,
          user_id: data.user_id
        });
      } else {
        console.log('🔍 [DEBUG] No settings found');
        setSalonSettings(null);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBarbers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

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
    console.log('🔍 [DEBUG] saveSalonSettings called with:', { 
      settings: { 
        ...settings, 
        stats_password: settings.stats_password ? '[HASH PROVIDED]' : 'undefined' 
      } 
    });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('🔍 [DEBUG] No authenticated user found');
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour sauvegarder",
          variant: "destructive"
        });
        return;
      }

      console.log('🔍 [DEBUG] User authenticated:', user.id);
      console.log('🔍 [DEBUG] Current salonSettings ID:', salonSettings?.id);

      // Utiliser l'ID existant du salonSettings pour faire un vrai UPDATE
      const dataToUpsert = {
        ...settings,
        user_id: user.id,
        id: salonSettings?.id || settings.id
      };
      
      console.log('🔍 [DEBUG] Data to upsert:', {
        ...dataToUpsert,
        stats_password: dataToUpsert.stats_password ? '[HASH]' : undefined
      });

      const { data, error } = await supabase
        .from('salon_settings')
        .upsert(dataToUpsert)
        .select()
        .single();

      console.log('🔍 [DEBUG] Supabase upsert result:', { 
        data: data ? { 
          ...data, 
          stats_password: data.stats_password ? '[HASH IN DB]' : null 
        } : null, 
        error 
      });

      if (error) {
        console.error('🔍 [DEBUG] Error saving settings:', error);
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder les paramètres",
          variant: "destructive"
        });
        return;
      }

      // Update local state immediately
      console.log('🔍 [DEBUG] Updating local state with:', { 
        id: data.id,
        name: data.name,
        stats_password: data.stats_password ? '[HASH]' : null
      });
      
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
      
      // Force refresh to ensure UI updates
      console.log('🔍 [DEBUG] Calling fetchSettings to refresh');
      await fetchSettings();
      console.log('🔍 [DEBUG] fetchSettings completed');
    } catch (error) {
      console.error('🔍 [DEBUG] Error saving settings:', error);
    }
  };

  const addBarber = async (barber: Omit<Barber, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive"
        });
        return null;
      }

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

  useEffect(() => {
    fetchSettings();
    fetchBarbers();
  }, []);

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