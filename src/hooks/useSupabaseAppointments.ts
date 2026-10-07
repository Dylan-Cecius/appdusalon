import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Appointment } from '@/data/appointments';
import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';

const appointmentErrorDescription = (error: unknown, action: 'add' | 'update') => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message || '')
        : '';

  if (message.includes('appointment_conflict') || message.includes('23P01')) {
    return 'Ce créneau est déjà occupé pour ce membre de l’équipe.';
  }

  if (message.includes('service_not_found')) {
    return 'Une prestation sélectionnée n’est plus disponible.';
  }

  if (message.includes('invalid_service_id')) {
    return 'Une prestation sélectionnée est invalide.';
  }

  if (message.includes('invalid_service_duration')) {
    return 'La durée de la prestation est invalide.';
  }

  if (message.includes('salon_access_denied')) {
    return 'Votre accès à ce salon n’est plus actif.';
  }

  return action === 'add'
    ? "Impossible d'ajouter le rendez-vous"
    : 'Impossible de mettre à jour le rendez-vous';
};


export const useSupabaseAppointments = () => {
  const { user, isReady } = useAuth();
  const { permissions } = usePermissions();
  const salonId = permissions.salonId;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const fetchAppointments = async () => {
    console.log('[Appointments] fetch start');
    try {
      if (!isSupabaseConfigured || !user || !salonId) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('appointments' as any)
        .select(`
          id,
          barber_id,
          staff_id,
          client_name,
          client_phone,
          start_time,
          end_time,
          services,
          total_price,
          status,
          is_paid,
          notes,
          created_at,
          updated_at
        `)
        .eq('salon_id', salonId)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formattedAppointments = data?.map((apt: any) => ({
        id: apt.id,
        clientName: apt.client_name || 'Client',
        clientPhone: apt.client_phone || '',
        services: apt.services as any,
        startTime: new Date(apt.start_time),
        endTime: new Date(apt.end_time),
        status: apt.status as 'scheduled' | 'completed' | 'cancelled',
        totalPrice: apt.total_price,
        notes: apt.notes,
        isPaid: apt.is_paid,
        barberId: apt.barber_id || undefined,
        staffId: apt.staff_id || undefined
      })) || [];

      console.log('[Appointments] fetch success', formattedAppointments.length);
      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('[Appointments] fetch error:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const getClientDetails = async (appointmentId: string) => {
    try {
      if (!isSupabaseConfigured) {
        return { clientName: 'Client', clientPhone: '***-***-****' };
      }

      const { data, error } = await supabase
        .rpc('get_appointment_client_details', { appointment_id: appointmentId });

      if (error) throw error;

      return {
        clientName: data?.[0]?.client_name || 'Client',
        clientPhone: data?.[0]?.client_phone || '***-***-****'
      };
    } catch (error) {
      console.error('Error fetching client details:', error);
      return { clientName: 'Client', clientPhone: '***-***-****' };
    }
  };

  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    try {
      if (!isSupabaseConfigured) {
        const newAppointment: Appointment = {
          ...appointment,
          id: Date.now().toString()
        };
        setAppointments(prev => [...prev, newAppointment]);
        toast({ title: "Succès", description: "Rendez-vous ajouté (mode local)" });
        return newAppointment;
      }

      if (!user) {
        toast({ title: "Erreur", description: "Vous devez être connecté", variant: "destructive" });
        return;
      }

      const { data: salonId } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });

      const { data, error } = await supabase
        .from('appointments' as any)
        .insert({
          client_name: appointment.clientName,
          client_phone: appointment.clientPhone || '',
          services: appointment.services as any,
          start_time: appointment.startTime.toISOString(),
          end_time: appointment.endTime.toISOString(),
          status: appointment.status,
          total_price: appointment.totalPrice,
          notes: appointment.notes,
          is_paid: appointment.isPaid,
          barber_id: appointment.barberId || null,
          staff_id: appointment.staffId || null,
          user_id: user.id,
          salon_id: salonId
        })
        .select(`id, barber_id, staff_id, start_time, end_time, services, total_price, status, is_paid, notes`)
        .single();

      if (error) throw error;

      const newAppointment: Appointment = {
        id: (data as any).id,
        clientName: 'Client',
        clientPhone: '***-***-****',
        services: (data as any).services as any,
        startTime: new Date((data as any).start_time),
        endTime: new Date((data as any).end_time),
        status: (data as any).status as 'scheduled' | 'completed' | 'cancelled',
        totalPrice: (data as any).total_price,
        notes: (data as any).notes,
        isPaid: (data as any).is_paid,
        barberId: (data as any).barber_id || undefined,
        staffId: (data as any).staff_id || undefined
      };

      setAppointments(prev => [...prev, newAppointment]);
      toast({ title: "Succès", description: "Rendez-vous ajouté avec succès" });

      return newAppointment;
    } catch (error) {
      console.error('Error adding appointment:', error);
      toast({
        title: "Rendez-vous impossible",
        description: appointmentErrorDescription(error, 'add'),
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const updateData: any = {};
      if (updates.clientName) updateData.client_name = updates.clientName;
      if (updates.clientPhone) updateData.client_phone = updates.clientPhone;
      if (updates.services) updateData.services = updates.services;
      if (updates.startTime) updateData.start_time = updates.startTime.toISOString();
      if (updates.endTime) updateData.end_time = updates.endTime.toISOString();
      if (updates.status) updateData.status = updates.status;
      if (updates.totalPrice !== undefined) updateData.total_price = updates.totalPrice;
      if (updates.notes !== undefined) updateData.notes = updates.notes;
      if (updates.isPaid !== undefined) updateData.is_paid = updates.isPaid;
      if (updates.barberId !== undefined) updateData.barber_id = updates.barberId;
      if (updates.staffId !== undefined) updateData.staff_id = updates.staffId;

      const { error } = await supabase
        .from('appointments' as any)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
      );

      toast({ title: "Succès", description: "Rendez-vous mis à jour avec succès" });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Modification impossible",
        description: appointmentErrorDescription(error, 'update'),
        variant: "destructive"
      });
      throw error;
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAppointments(prev => prev.filter(apt => apt.id !== id));
      toast({ title: "Succès", description: "Rendez-vous supprimé avec succès" });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({ title: "Erreur", description: "Impossible de supprimer le rendez-vous", variant: "destructive" });
      throw error;
    }
  };

  const markAsPaid = async (id: string, method: 'cash' | 'card') => {
    try {
      const { error } = await (supabase as any).rpc('settle_appointment', {
        appointment_id_param: id,
        payment_method_param: method,
      });

      if (error) throw error;

      setAppointments(prev =>
        prev.map(appointment =>
          appointment.id === id
            ? { ...appointment, isPaid: true, status: 'completed' }
            : appointment
        )
      );

      toast({
        title: "Paiement enregistré",
        description: `Le rendez-vous a été encaissé par ${method === 'cash' ? 'espèces' : 'carte'}.`,
      });
    } catch (error) {
      console.error('Error settling appointment:', error);
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message || '')
            : '';

      let description = "Impossible d’encaisser ce rendez-vous";
      if (message.includes('appointment_already_paid')) {
        description = "Ce rendez-vous a déjà été encaissé.";
      } else if (message.includes('appointment_cancelled')) {
        description = "Un rendez-vous annulé ne peut pas être encaissé.";
      } else if (message.includes('appointment_not_billable')) {
        description = "Ce rendez-vous ne contient aucune prestation facturable.";
      }

      toast({
        title: "Encaissement impossible",
        description,
        variant: "destructive",
      });
      throw error;
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      apt.startTime.toDateString() === date.toDateString()
    );
  };

  // Gate on auth readiness
  useEffect(() => {
    if (!isReady) return;

    if (!user || !salonId) {
      setAppointments([]);
      setLoading(false);
      userIdRef.current = null;
      return;
    }

    if (userIdRef.current === user.id) return;
    userIdRef.current = user.id;

    console.log('[Appointments] effect trigger — fetching for salon', salonId);
    setLoading(true);
    fetchAppointments();

    if (!isSupabaseConfigured) return;

    const subscription = supabase
      .channel(`appointments-${salonId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `salon_id=eq.${salonId}`,
        },
        () => { void fetchAppointments(); }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isReady, user?.id, salonId]);

  return {
    appointments,
    loading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    markAsPaid,
    getAppointmentsForDate,
    getClientDetails,
    refreshAppointments: fetchAppointments
  };
};
