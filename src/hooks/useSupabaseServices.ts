import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  appointmentBuffer: number;
  isActive: boolean;
  displayOrder: number;
}

export const useSupabaseServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchServices = async () => {
    if (!user) {
      setServices([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching services:', error);
        return;
      }

      const formattedServices: Service[] = data?.map(service => ({
        id: service.id,
        name: service.name,
        price: Number(service.price),
        duration: service.duration,
        category: service.category,
        appointmentBuffer: service.appointment_buffer || 0,
        isActive: service.is_active,
        displayOrder: service.display_order || 0
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
      const { data, error } = await supabase
        .from('services')
        .insert({
          user_id: user.id,
          name: serviceData.name,
          price: serviceData.price,
          duration: serviceData.duration,
          category: serviceData.category,
          appointment_buffer: serviceData.appointmentBuffer,
          is_active: serviceData.isActive,
          display_order: serviceData.displayOrder
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding service:', error);
        throw error;
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

      const { error } = await supabase
        .from('services')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating service:', error);
        throw error;
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
        .eq('user_id', user.id)
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
        .eq('user_id', user.id)
        .eq('is_active', true); // Sécurité supplémentaire

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
    fetchServices();
  }, [user]);

  // Group services by category
  const getServicesByCategory = (category: string) => {
    return services.filter(service => service.category === category);
  };

  const categories = [
    { id: 'coupe', name: 'Coupes' },
    { id: 'barbe', name: 'Barbe' },
    { id: 'combo', name: 'Formules' },
    { id: 'soin', name: 'Soins' },
    { id: 'couleur', name: 'Couleurs' },
    { id: 'produit', name: 'Produits' }
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