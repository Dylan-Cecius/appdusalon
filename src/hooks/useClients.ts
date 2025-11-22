import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const fetchClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
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
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...client, user_id: user.id }])
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
    if (!user) return { totalSpent: 0, visitCount: 0, lastVisit: null };

    try {
      // Récupérer les transactions du client
      const { data: transactions } = await supabase
        .from('transactions')
        .select('total_amount, transaction_date')
        .eq('client_id', clientId)
        .eq('user_id', user.id);

      // Récupérer les rendez-vous du client
      const { data: appointments } = await supabase
        .from('appointments')
        .select('total_price, start_time, is_paid')
        .eq('user_id', user.id);

      const client = clients.find(c => c.id === clientId);
      const clientAppointments = appointments?.filter(
        apt => apt.start_time && client && 
        (apt as any).client_phone === client.phone
      ) || [];

      const totalFromTransactions = transactions?.reduce((sum, t) => sum + Number(t.total_amount), 0) || 0;
      const totalFromAppointments = clientAppointments
        .filter(apt => apt.is_paid)
        .reduce((sum, apt) => sum + Number(apt.total_price), 0);

      const transactionDates = transactions?.map(t => new Date(t.transaction_date)) || [];
      const appointmentDates = clientAppointments.map(apt => new Date(apt.start_time));
      const allDates = [...transactionDates, ...appointmentDates];
      const lastVisit = allDates.length > 0 
        ? allDates.sort((a, b) => b.getTime() - a.getTime())[0].toISOString()
        : null;

      return {
        totalSpent: totalFromTransactions + totalFromAppointments,
        visitCount: (transactions?.length || 0) + clientAppointments.length,
        lastVisit,
      };
    } catch (error) {
      console.error('Error fetching client stats:', error);
      return { totalSpent: 0, visitCount: 0, lastVisit: null };
    }
  };

  useEffect(() => {
    fetchClients();

    // Real-time subscription
    const channel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
