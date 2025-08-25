import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  services: any[];
  startTime: Date;
  endTime: Date;
  status: 'scheduled' | 'completed' | 'cancelled';
  totalPrice: number;
  notes?: string;
  isPaid: boolean;
}

export const useSupabaseAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch appointments from Supabase
  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formattedAppointments = data.map(apt => ({
        id: apt.id,
        clientName: apt.client_name,
        clientPhone: apt.client_phone,
        services: apt.services,
        startTime: new Date(apt.start_time),
        endTime: new Date(apt.end_time),
        status: apt.status,
        totalPrice: parseFloat(apt.total_price),
        notes: apt.notes,
        isPaid: apt.is_paid
      }));

      setAppointments(formattedAppointments);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les rendez-vous",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Add new appointment
  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_name: appointment.clientName,
          client_phone: appointment.clientPhone,
          services: appointment.services,
          start_time: appointment.startTime.toISOString(),
          end_time: appointment.endTime.toISOString(),
          status: appointment.status,
          total_price: appointment.totalPrice,
          notes: appointment.notes,
          is_paid: appointment.isPaid
        })
        .select()
        .single();

      if (error) throw error;

      const newAppointment: Appointment = {
        id: data.id,
        clientName: data.client_name,
        clientPhone: data.client_phone,
        services: data.services,
        startTime: new Date(data.start_time),
        endTime: new Date(data.end_time),
        status: data.status,
        totalPrice: parseFloat(data.total_price),
        notes: data.notes,
        isPaid: data.is_paid
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

      const { error } = await supabase
        .from('appointments')
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
        .from('appointments')
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