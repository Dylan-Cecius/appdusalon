import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from './usePermissions';

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientStats {
  totalSpent: number;
  visitCount: number;
  lastVisit: string | null;
}

export const useClients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const salonId = permissions.salonId;

  const fetchClients = async () => {
    if (!user || !salonId) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('salon_id', salonId)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addClient = async (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user || !salonId) return null;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...client, user_id: user.id, salon_id: salonId }])
        .select()
        .single();

      if (error) throw error;

      setClients(prev => [...prev, data]);
      toast({
        title: "Client ajouté",
        description: `${client.name} a été ajouté à vos clients`,
      });
      return data;
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'ajouter le client",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setClients(prev => prev.map(c => c.id === id ? data : c));
      toast({
        title: "Client mis à jour",
        description: "Les informations du client ont été mises à jour",
      });
      return data;
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le client",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Client supprimé",
        description: "Le client a été supprimé",
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le client",
        variant: "destructive",
      });
    }
  };

  const getClientStats = async (clientId: string): Promise<ClientStats> => {
    if (!user || !salonId) return { totalSpent: 0, visitCount: 0, lastVisit: null };

    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return { totalSpent: 0, visitCount: 0, lastVisit: null };

      const [{ data: transactions }, { data: appointments }] = await Promise.all([
        supabase
          .from('transactions')
          .select('total_amount, transaction_date')
          .eq('client_id', clientId)
          .eq('salon_id', salonId),
        supabase
          .from('appointments')
          .select('start_time, status')
          .eq('salon_id', salonId)
          .eq('client_phone', client.phone)
          .neq('status', 'cancelled')
          .lte('start_time', new Date().toISOString()),
      ]);

      // Accounting revenue is canonical from POS transactions only.
      const totalSpent = transactions?.reduce(
        (sum, transaction) => sum + Number(transaction.total_amount),
        0
      ) || 0;

      const transactionDates = transactions?.map(
        transaction => new Date(transaction.transaction_date)
      ) || [];
      const appointmentDates = appointments?.map(
        appointment => new Date(appointment.start_time)
      ) || [];
      const allDates = [...transactionDates, ...appointmentDates];

      const lastVisit = allDates.length > 0
        ? allDates.sort((a, b) => b.getTime() - a.getTime())[0].toISOString()
        : null;

      return {
        totalSpent,
        visitCount: appointments?.length || transactions?.length || 0,
        lastVisit,
      };
    } catch (error) {
      console.error('Error fetching client stats:', error);
      return { totalSpent: 0, visitCount: 0, lastVisit: null };
    }
  };

  useEffect(() => {
    if (!user || !salonId) {
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchClients();

    const channel = supabase
      .channel(`clients-changes-${salonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `salon_id=eq.${salonId}`,
        },
        () => {
          void fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, salonId]);

  return {
    clients,
    loading,
    addClient,
    updateClient,
    deleteClient,
    getClientStats,
    refreshClients: fetchClients,
  };
};
