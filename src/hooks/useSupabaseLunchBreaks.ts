import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LunchBreakData } from '@/components/LunchBreakModal';

export const useSupabaseLunchBreaks = () => {
  const [lunchBreaks, setLunchBreaks] = useState<LunchBreakData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLunchBreaks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lunch_breaks')
        .select('*');

      if (error) {
        console.error('Error fetching lunch breaks:', error);
        return;
      }

      if (data) {
        const mappedData: LunchBreakData[] = data.map(item => ({
          barberId: item.barber_id,
          startTime: item.start_time,
          endTime: item.end_time,
          duration: item.duration,
          isActive: item.is_active
        }));
        setLunchBreaks(mappedData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveLunchBreak = async (breakData: LunchBreakData) => {
    try {
      const { data, error } = await supabase
        .from('lunch_breaks')
        .upsert({
          barber_id: breakData.barberId,
          start_time: breakData.startTime,
          end_time: breakData.endTime,
          duration: breakData.duration,
          is_active: breakData.isActive
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder le temps de midi",
          variant: "destructive"
        });
        return;
      }

      // Update local state
      setLunchBreaks(prev => {
        const filtered = prev.filter(lb => lb.barberId !== breakData.barberId);
        return [...filtered, breakData];
      });

      toast({
        title: "Succès",
        description: "Temps de midi configuré avec succès"
      });
    } catch (error) {
      console.error('Error saving lunch break:', error);
    }
  };

  const deleteLunchBreak = async (barberId: string) => {
    try {
      const { error } = await supabase
        .from('lunch_breaks')
        .delete()
        .eq('barber_id', barberId);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le temps de midi",
          variant: "destructive"
        });
        return;
      }

      setLunchBreaks(prev => prev.filter(lb => lb.barberId !== barberId));
      toast({
        title: "Succès",
        description: "Temps de midi supprimé avec succès"
      });
    } catch (error) {
      console.error('Error deleting lunch break:', error);
    }
  };

  const getLunchBreak = (barberId: string) => {
    return lunchBreaks.find(lb => lb.barberId === barberId);
  };

  const isLunchBreakTime = (barberId: string, timeSlot: string) => {
    const lunchBreak = lunchBreaks.find(lb => lb.barberId === barberId && lb.isActive);
    if (!lunchBreak) return false;
    
    const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
    const [startHour, startMinute] = lunchBreak.startTime.split(':').map(Number);
    const [endHour, endMinute] = lunchBreak.endTime.split(':').map(Number);
    
    const slotTime = slotHour * 60 + slotMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    return slotTime >= startTime && slotTime < endTime;
  };

  useEffect(() => {
    fetchLunchBreaks();
  }, []);

  return {
    lunchBreaks,
    loading,
    saveLunchBreak,
    deleteLunchBreak,
    getLunchBreak,
    isLunchBreakTime,
    fetchLunchBreaks
  };
};