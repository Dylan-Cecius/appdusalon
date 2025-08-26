import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { mockAppointments, Appointment } from '@/data/appointments';

export const useSupabaseAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch appointments from Supabase or use mock data
  const fetchAppointments = async () => {
    try {
      if (!isSupabaseConfigured) {
        // Use mock data when Supabase is not configured
        setAppointments(mockAppointments);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('appointments' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formattedAppointments = data?.map((apt: any) => ({
        id: apt.id,
        clientName: apt.client_name,
        clientPhone: apt.client_phone,
        services: apt.services as any,
        startTime: new Date(apt.start_time),
        endTime: new Date(apt.end_time),
        status: apt.status as 'scheduled' | 'completed' | 'cancelled',
        totalPrice: apt.total_price,
        notes: apt.notes,
        isPaid: apt.is_paid,
        barberId: apt.barber_id
      })) || [];

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Fallback to mock data
      setAppointments(mockAppointments);
    } finally {
      setLoading(false);
    }
  };

  // Add new appointment
  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    try {
      if (!isSupabaseConfigured) {
        // Local fallback when Supabase is not configured
        const newAppointment: Appointment = {
          ...appointment,
          id: Date.now().toString()
        };
        setAppointments(prev => [...prev, newAppointment]);
        toast({
          title: "Succès",
          description: "Rendez-vous ajouté (mode local)"
        });
        return newAppointment;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('appointments' as any)
        .insert({
          client_name: appointment.clientName,
          client_phone: appointment.clientPhone,
          services: appointment.services as any,
          start_time: appointment.startTime.toISOString(),
          end_time: appointment.endTime.toISOString(),
          status: appointment.status,
          total_price: appointment.totalPrice,
          notes: appointment.notes,
          is_paid: appointment.isPaid,
          barber_id: appointment.barberId,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      const newAppointment: Appointment = {
        id: (data as any).id,
        clientName: (data as any).client_name,
        clientPhone: (data as any).client_phone,
        services: (data as any).services as any,
        startTime: new Date((data as any).start_time),
        endTime: new Date((data as any).end_time),
        status: (data as any).status as 'scheduled' | 'completed' | 'cancelled',
        totalPrice: (data as any).total_price,
        notes: (data as any).notes,
        isPaid: (data as any).is_paid,
        barberId: (data as any).barber_id
      };

      setAppointments(prev => [...prev, newAppointment]);
      
      toast({
        title: "Succès",
        description: "Rendez-vous ajouté avec succès"
      });

      return newAppointment;
    } catch (error) {
      console.error('Error adding appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le rendez-vous",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Update appointment
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

      const { error } = await supabase
        .from('appointments' as any)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setAppointments(prev => 
        prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt)
      );

      toast({
        title: "Succès",
        description: "Rendez-vous mis à jour avec succès"
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rendez-vous",
        variant: "destructive"
      });
    }
  };

  // Delete appointment
  const deleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAppointments(prev => prev.filter(apt => apt.id !== id));
      
      toast({
        title: "Succès",
        description: "Rendez-vous supprimé avec succès"
      });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rendez-vous",
        variant: "destructive"
      });
    }
  };

  // Mark as paid
  const markAsPaid = async (id: string) => {
    await updateAppointment(id, { isPaid: true, status: 'completed' });
  };

  // Get appointments for specific date
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      apt.startTime.toDateString() === date.toDateString()
    );
  };

  useEffect(() => {
    fetchAppointments();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('appointments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    appointments,
    loading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    markAsPaid,
    getAppointmentsForDate,
    refreshAppointments: fetchAppointments
  };
};