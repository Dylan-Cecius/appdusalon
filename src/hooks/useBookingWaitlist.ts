import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';

export type BookingWaitlistEntry = {
  id: string;
  salon_id: string;
  service_id: string;
  preferred_staff_id: string | null;
  client_name: string;
  client_phone: string;
  preferred_date_from: string;
  preferred_date_to: string;
  preferred_time_start: string | null;
  preferred_time_end: string | null;
  status: 'active' | 'notified' | 'booked' | 'cancelled' | 'expired';
  notification_count: number;
  last_notified_at: string | null;
  offer_expires_at: string | null;
  created_at: string;
  service?: { name?: string | null } | null;
  preferred_staff?: { name?: string | null } | null;
};

export const useBookingWaitlist = () => {
  const { permissions } = usePermissions();
  const salonId = permissions.salonId;
  const [entries, setEntries] = useState<BookingWaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!salonId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('booking_waitlist')
        .select(`
          id,
          salon_id,
          service_id,
          preferred_staff_id,
          client_name,
          client_phone,
          preferred_date_from,
          preferred_date_to,
          preferred_time_start,
          preferred_time_end,
          status,
          notification_count,
          last_notified_at,
          offer_expires_at,
          created_at,
          service:services(name),
          preferred_staff:staff(name)
        `)
        .eq('salon_id', salonId)
        .in('status', ['active', 'notified'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setEntries((data || []) as BookingWaitlistEntry[]);
    } catch (error) {
      console.error('[BookingWaitlist] fetch failed', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [salonId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!salonId) return;

    const channel = supabase
      .channel('booking-waitlist-' + salonId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_waitlist',
          filter: 'salon_id=eq.' + salonId,
        },
        () => void refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [salonId, refresh]);

  const cancelEntry = async (id: string) => {
    const { error } = await (supabase as any)
      .from('booking_waitlist')
      .update({ status: 'cancelled', offer_expires_at: null })
      .eq('id', id)
      .eq('salon_id', salonId);

    if (error) throw error;

    toast({
      title: "Liste d'attente mise à jour",
      description: 'La demande a été retirée.',
    });

    await refresh();
  };

  return {
    entries,
    loading,
    activeCount: entries.length,
    refresh,
    cancelEntry,
  };
};
