import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface DaySchedule {
  day_of_week: number; // 0=Monday, 6=Sunday
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start: string | null;
  break_end: string | null;
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day_of_week: 0, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null },
  { day_of_week: 1, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null },
  { day_of_week: 2, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null },
  { day_of_week: 3, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null },
  { day_of_week: 4, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null },
  { day_of_week: 5, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null },
  { day_of_week: 6, is_open: false, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null },
];

const DAY_LABELS: Record<number, string> = {
  0: 'Lundi',
  1: 'Mardi',
  2: 'Mercredi',
  3: 'Jeudi',
  4: 'Vendredi',
  5: 'Samedi',
  6: 'Dimanche',
};

export const useOpeningHours = () => {
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasData, setHasData] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: salonIdData } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });
      if (!salonIdData) return;

      const { data, error } = await supabase
        .from('opening_hours')
        .select('*')
        .eq('salon_id', salonIdData)
        .order('day_of_week');

      if (error) {
        console.error('Error fetching opening hours:', error);
        return;
      }

      if (data && data.length > 0) {
        setHasData(true);
        const merged = DEFAULT_SCHEDULE.map(def => {
          const found = data.find((d: any) => d.day_of_week === def.day_of_week);
          return found ? {
            day_of_week: found.day_of_week,
            is_open: found.is_open,
            open_time: found.open_time,
            close_time: found.close_time,
            break_start: found.break_start,
            break_end: found.break_end,
          } : def;
        });
        setSchedule(merged);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSchedule = async (newSchedule: DaySchedule[]) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: salonId } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });
      if (!salonId) return;

      // Upsert all 7 days
      const rows = newSchedule.map(day => ({
        salon_id: salonId,
        day_of_week: day.day_of_week,
        is_open: day.is_open,
        open_time: day.open_time,
        close_time: day.close_time,
        break_start: day.break_start || null,
        break_end: day.break_end || null,
      }));

      const { error } = await supabase
        .from('opening_hours')
        .upsert(rows, { onConflict: 'salon_id,day_of_week' });

      if (error) {
        console.error('Error saving opening hours:', error);
        toast({ title: 'Erreur', description: 'Impossible de sauvegarder les horaires', variant: 'destructive' });
        return;
      }

      setSchedule(newSchedule);
      setHasData(true);
      toast({ title: '✅ Horaires sauvegardés', description: 'Les heures d\'ouverture ont été mises à jour' });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Helper: check if a given JS Date falls within open hours
  const isTimeOpen = useCallback((date: Date): boolean => {
    if (!hasData) return true; // No config = always open (default behavior)
    // JS getDay: 0=Sunday, convert to our 0=Monday
    const jsDay = date.getDay();
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const day = schedule.find(s => s.day_of_week === dayIndex);
    if (!day || !day.is_open) return false;

    const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (timeStr < day.open_time || timeStr >= day.close_time) return false;

    // Check break
    if (day.break_start && day.break_end) {
      if (timeStr >= day.break_start && timeStr < day.break_end) return false;
    }
    return true;
  }, [schedule, hasData]);

  // Helper: check if a day is open
  const isDayOpen = useCallback((date: Date): boolean => {
    if (!hasData) return true;
    const jsDay = date.getDay();
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
    const day = schedule.find(s => s.day_of_week === dayIndex);
    return day?.is_open ?? true;
  }, [schedule, hasData]);

  // Get schedule for a specific date
  const getScheduleForDate = useCallback((date: Date): DaySchedule | null => {
    if (!hasData) return null;
    const jsDay = date.getDay();
    const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
    return schedule.find(s => s.day_of_week === dayIndex) || null;
  }, [schedule, hasData]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return {
    schedule,
    setSchedule,
    loading,
    saving,
    hasData,
    saveSchedule,
    isTimeOpen,
    isDayOpen,
    getScheduleForDate,
    DAY_LABELS,
  };
};
