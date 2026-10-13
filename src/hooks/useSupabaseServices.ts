import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ServiceStep {
  id?: string;
  name: string;
  type: 'work' | 'pause' | 'cleanup';
  duration: number;
  customerVisible: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  appointmentBuffer: number;
  isActive: boolean;
  displayOrder: number;
  color: string;
  bookingPaymentMode: 'none' | 'deposit_fixed' | 'deposit_percent' | 'full';
  bookingPaymentValue: number;
  cancellationDeadlineHours: number;
  lateCancellationPolicy: 'keep_deposit' | 'refund_deposit';
  steps: ServiceStep[];
}

export const useSupabaseServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isReady } = useAuth();

  const fetchServices = async () => {
    if (!user) {
      setServices([]);
      setLoading(false);
      return;
    }

    try {
      const { data: salonId } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });

      const [
        { data, error },
        { data: stepsData, error: stepsError },
      ] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('salon_id', salonId)
          .eq('is_active', true)
          .neq('category', 'produit')
          .order('display_order'),
        (supabase as any)
          .from('service_steps')
          .select('id, service_id, position, name, step_type, duration_minutes, customer_visible')
          .eq('salon_id', salonId)
          .order('position'),
      ]);

      if (error) {
        console.error('Error fetching services:', error);
        return;
      }

      if (stepsError) {
        console.error('Error fetching service steps:', stepsError);
        return;
      }

      const stepsByService = new Map<string, ServiceStep[]>();
      for (const step of (stepsData || []) as any[]) {
        const existing = stepsByService.get(step.service_id) || [];
        existing.push({
          id: step.id,
          name: step.name,
          type: step.step_type,
          duration: Number(step.duration_minutes),
          customerVisible: Boolean(step.customer_visible),
        });
        stepsByService.set(step.service_id, existing);
      }

      const formattedServices: Service[] = data?.map(service => ({
        id: service.id,
        name: service.name,
        price: Number(service.price),
        duration: service.duration,
        category: service.category,
        appointmentBuffer: service.appointment_buffer || 0,
        isActive: service.is_active,
        displayOrder: service.display_order || 0,
        color: (service as any).color || '#6B7280',
        bookingPaymentMode: ((service as any).booking_payment_mode || 'none') as Service['bookingPaymentMode'],
        bookingPaymentValue: Number((service as any).booking_payment_value || 0),
        cancellationDeadlineHours: Number((service as any).cancellation_deadline_hours ?? 24),
        lateCancellationPolicy: ((service as any).late_cancellation_policy || 'keep_deposit') as Service['lateCancellationPolicy'],
        steps: stepsByService.get(service.id) || []
      })) || [];

      setServices(formattedServices);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const addService = async (serviceData: Omit<Service, 'id'>) => {
    if (!user) return null;

    try {
      const { data: salonId } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });

      const { data, error } = await supabase
        .from('services')
        .insert({
          user_id: user.id,
          salon_id: salonId,
          name: serviceData.name,
          price: serviceData.price,
          duration: serviceData.duration,
          category: serviceData.category,
          appointment_buffer: serviceData.appointmentBuffer,
          is_active: serviceData.isActive,
          display_order: serviceData.displayOrder,
          color: serviceData.color,
          booking_payment_mode: serviceData.bookingPaymentMode,
          booking_payment_value: serviceData.bookingPaymentValue,
          cancellation_deadline_hours: serviceData.cancellationDeadlineHours,
          late_cancellation_policy: serviceData.lateCancellationPolicy
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error adding service:', error);
        throw error;
      }

      if (serviceData.steps.length > 0) {
        const { error: stepsError } = await (supabase as any).rpc(
          'replace_service_steps',
          {
            target_service_id: data.id,
            steps_payload: serviceData.steps.map((step) => ({
              name: step.name,
              type: step.type,
              duration: step.duration,
              customer_visible: step.customerVisible,
            })),
          }
        );

        if (stepsError) {
          await supabase.from('services').delete().eq('id', data.id);
          throw stepsError;
        }
      }

      await fetchServices();
      return data;
    } catch (error) {
      console.error('Error adding service:', error);
      throw error;
    }
  };

  const updateService = async (id: string, serviceData: Partial<Service>) => {
    if (!user) return;

    try {
      const updateData: any = {};
      if (serviceData.name !== undefined) updateData.name = serviceData.name;
      if (serviceData.price !== undefined) updateData.price = serviceData.price;
      if (serviceData.duration !== undefined) updateData.duration = serviceData.duration;
      if (serviceData.category !== undefined) updateData.category = serviceData.category;
      if (serviceData.appointmentBuffer !== undefined) updateData.appointment_buffer = serviceData.appointmentBuffer;
      if (serviceData.isActive !== undefined) updateData.is_active = serviceData.isActive;
      if (serviceData.displayOrder !== undefined) updateData.display_order = serviceData.displayOrder;
      if (serviceData.color !== undefined) updateData.color = serviceData.color;
      if (serviceData.bookingPaymentMode !== undefined) updateData.booking_payment_mode = serviceData.bookingPaymentMode;
      if (serviceData.bookingPaymentValue !== undefined) updateData.booking_payment_value = serviceData.bookingPaymentValue;
      if (serviceData.cancellationDeadlineHours !== undefined) updateData.cancellation_deadline_hours = serviceData.cancellationDeadlineHours;
      if (serviceData.lateCancellationPolicy !== undefined) updateData.late_cancellation_policy = serviceData.lateCancellationPolicy;

      const { error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating service:', error);
        throw error;
      }

      if (serviceData.steps !== undefined) {
        const { error: stepsError } = await (supabase as any).rpc(
          'replace_service_steps',
          {
            target_service_id: id,
            steps_payload: serviceData.steps.map((step) => ({
              name: step.name,
              type: step.type,
              duration: step.duration,
              customer_visible: step.customerVisible,
            })),
          }
        );

        if (stepsError) throw stepsError;
      }

      await fetchServices();
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  };

  const deleteService = async (id: string) => {
    if (!user) return;

    try {
      // Vérifier d'abord que le service existe avant de le supprimer
      const { data: existingService, error: fetchError } = await supabase
        .from('services')
        .select('id, name')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (fetchError || !existingService) {
        console.error('Service not found or already inactive:', fetchError);
        throw new Error('Service introuvable ou déjà supprimé');
      }

      // Soft delete - mark as inactive instead of actual deletion
      const { error } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', id)
        .eq('is_active', true);

      if (error) {
        console.error('Error deleting service:', error);
        throw error;
      }

      await fetchServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!isReady) {
      setLoading(true);
      return;
    }

    console.log('[Services] effect trigger', { userId: user?.id ?? null });

    if (!user) {
      setServices([]);
      setLoading(false);
      return;
    }

    void fetchServices();
  }, [isReady, user?.id]);

  // Group services by category
  const getServicesByCategory = (category: string) => {
    return services.filter(service => service.category === category);
  };

  const categories = [
    { id: 'coupe', name: 'Coupes' },
    { id: 'barbe', name: 'Barbe' },
    { id: 'combo', name: 'Formules' },
    { id: 'soin', name: 'Soins' },
    { id: 'couleur', name: 'Couleurs' }
  ];

  return {
    services,
    loading,
    addService,
    updateService,
    deleteService,
    fetchServices,
    getServicesByCategory,
    categories
  };
};