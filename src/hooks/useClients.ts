import { createLatestRequestScope } from '@/lib/latestRequestScope';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  birth_date?: string;
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
  const { user, isReady } = useAuth();
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const salonId = permissions.salonId;
  const [error, setError] = useState(false);
  const contextKey = isReady && user && salonId ? JSON.stringify([user.id, salonId]) : null;
  const requestScope = useRef(createLatestRequestScope());
  const clientsContext = useRef<string | null>(null);
  requestScope.current.setContext(contextKey);
  const visibleClients = clientsContext.current === contextKey ? clients : [];

  const fetchClients = async () => {
    const isCurrent = requestScope.current.begin(contextKey);
    if (!isCurrent) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('salon_id', salonId)
        .order('name');

      if (!isCurrent()) return;
      if (error) throw error;
      clientsContext.current = contextKey;
      setClients(data || []);
      setError(false);
    } catch (error) {
      if (!isCurrent()) return;
      setError(true);
      console.error('Error fetching clients:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les clients",
        variant: "destructive",
      });
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  const addClient = async (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const isCurrentContext = requestScope.current.captureContext(contextKey);
    if (!user || !salonId || !isCurrentContext()) return null;

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ ...client, user_id: user.id, salon_id: salonId }])
        .select()
        .single();

      if (error) throw error;

      if (!data?.id) throw new Error('client_creation_unconfirmed');
      if (!isCurrentContext()) return null;
      setClients(prev => prev.some(client => client.id === data.id) ? prev : [...prev, data]);
      void fetchClients();
      toast({
        title: "Client ajouté",
        description: `${client.name} a été ajouté à vos clients`,
      });
      return data;
    } catch (error: any) {
      if (!isCurrentContext()) return null;
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
    const isCurrentContext = requestScope.current.captureContext(contextKey);
    if (!user || !salonId || !isCurrentContext()) return null;
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .eq('salon_id', salonId)
        .select()
        .single();

      if (error) throw error;

      if (!data || data.id !== id) throw new Error('client_update_unconfirmed');
      if (!isCurrentContext()) return null;
      setClients(prev => prev.map(c => c.id === id ? data : c));
      void fetchClients();
      toast({
        title: "Client mis à jour",
        description: "Les informations du client ont été mises à jour",
      });
      return data;
    } catch (error) {
      if (!isCurrentContext()) return null;
      console.error('Error updating client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le client",
        variant: "destructive",
      });
      return null;
    }
  };

  const getClientStats = useCallback(async (clientId: string): Promise<ClientStats> => {
    const isCurrentContext = requestScope.current.captureContext(contextKey);
    if (!user || !salonId || !isCurrentContext() || clientsContext.current !== contextKey) return { totalSpent: 0, visitCount: 0, lastVisit: null };

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

      if (!isCurrentContext()) return { totalSpent: 0, visitCount: 0, lastVisit: null };
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
        visitCount: Math.max(appointments?.length || 0, transactions?.length || 0),
        lastVisit,
      };
    } catch (error) {
      console.error('Error fetching client stats:', error);
      return { totalSpent: 0, visitCount: 0, lastVisit: null };
    }
  }, [clients, user?.id, salonId, contextKey]);

  useEffect(() => {
    const scope = requestScope.current;
    clientsContext.current = contextKey;
    setClients([]); setError(false);
    if (!contextKey) {
      setLoading(!isReady);
      return () => scope.invalidate();
    }
    void fetchClients();
    const isCurrentContext = scope.captureContext(contextKey);
    const channel = supabase
      .channel(`clients-changes-${salonId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'clients', filter: `salon_id=eq.${salonId}`,
      }, () => { if (isCurrentContext()) void fetchClients(); })
      .subscribe(status => {
        if (!isCurrentContext()) return;
        if (status === 'SUBSCRIBED') void fetchClients();
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setError(true);
      });
    return () => {
      scope.invalidate();
      void supabase.removeChannel(channel);
    };
  }, [contextKey, isReady]);

  return {
    clients: visibleClients,
    loading: clientsContext.current !== contextKey || loading,
    error: clientsContext.current === contextKey && error,
    addClient,
    updateClient,
    getClientStats,
    refreshClients: fetchClients,
    captureScope: () => requestScope.current.captureContext(contextKey),
  };
};
