import { clientCreateFields, persistClientEdit, type ClientWriter } from '@/lib/clientPersistence';
import { useSubscriptionRights } from '@/hooks/useSubscriptionRights';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/components/ui/use-toast';
import { createLatestRequestScope } from '@/lib/latestRequestScope';
import { readCompleteRows } from '@/lib/readCompleteRows';
import type { Client, ClientStats } from '@/lib/clients';
const emptyClients: Client[] = [];
interface ClientsValue {
  clients: Client[]; loading: boolean; error: string | null; hasSnapshot: boolean; contextKey: string | null;
  addClient: (input: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Client | null>;
  updateClient: (id: string, updates: Partial<Client>, expectedRevision: string) => Promise<Client | null>;
  getClientStats: (id: string) => Promise<ClientStats>;
  refreshClients: () => Promise<void>;
}
const ClientsContext = createContext<ClientsValue | null>(null);
export function ClientsProvider({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const { permissions } = usePermissions();
  const salonId = permissions.salonId;
  const { rights } = useSubscriptionRights();
  const contextKey = isReady && user && salonId ? JSON.stringify([user.id, salonId]) : null;
  const scope = useRef(createLatestRequestScope());
  scope.current.setContext(contextKey);
  const [snapshot, setSnapshot] = useState<{ context: string; clients: Client[] } | null>(null);
  const [readState, setReadState] = useState<{ context: string; loading: boolean; error: string | null } | null>(null);
  const hasSnapshot = !!contextKey && snapshot?.context === contextKey;
  const visibleClients = hasSnapshot ? snapshot.clients : emptyClients;
  const error = readState?.context === contextKey ? readState.error : null;
  const loading = !isReady || (!!contextKey && (readState?.context !== contextKey || readState.loading));
  const fetchClients = useCallback(async () => {
    const current = scope.current.begin(contextKey);
    if (!current || !salonId) return;
    setReadState({ context: contextKey!, loading: true, error: null });
    try {
      const clients = await readCompleteRows<Client>(async (from, to) => {
        const response = await supabase.from('clients').select('*', { count: 'exact' }).eq('salon_id', salonId).order('name').order('id').range(from, to);
        return response;
      }, current);
      if (!current() || clients === null) return;
      setSnapshot({ context: contextKey!, clients });
      setReadState({ context: contextKey!, loading: false, error: null });
    } catch {
      if (current()) setReadState({ context: contextKey!, loading: false, error: 'Impossible de charger la liste complète des clients. Réessayez avant de modifier ou exporter une fiche.' });
    }
  }, [contextKey, salonId]);

  const addClient = async (client: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const current = scope.current.captureContext(contextKey);
    if (!current() || !user || !salonId) return null;
    try {
      const { data, error } = await supabase.from('clients').insert([{ ...clientCreateFields(client, rights.canAccessFullClientNotes), user_id: user.id, salon_id: salonId }]).select().single();
      if (error) throw error;
      if (!current() || !data?.id) return null;
      setSnapshot(previous => previous?.context === contextKey ? { ...previous, clients: [...previous.clients.filter(row => row.id !== data.id), data] } : previous);
      await fetchClients();
      if (current()) toast({ title: 'Client ajouté', description: `${client.name} a été ajouté à vos clients` });
      return current() ? data : null;
    } catch {
      if (current()) toast({ title: 'Erreur', description: "Impossible de confirmer l’ajout du client.", variant: 'destructive' });
      return null;
    }
  };
  const updateClient = async (id: string, updates: Partial<Client>, expectedRevision: string) => {
    const current = scope.current.captureContext(contextKey);
    if (!current() || !salonId) return null;
    try {
      const data = await persistClientEdit(supabase as unknown as ClientWriter, salonId, id, expectedRevision, updates, rights.canAccessFullClientNotes);
      if (!current()) return null;
      setSnapshot(previous => previous?.context === contextKey ? { ...previous, clients: previous.clients.map(row => row.id === id ? data : row) } : previous);
      await fetchClients();
      if (current()) toast({ title: 'Client mis à jour', description: 'Les informations du client ont été mises à jour' });
      return current() ? data : null;
    } catch {
      if (current()) toast({ title: 'Erreur', description: 'Impossible de confirmer la modification du client.', variant: 'destructive' });
      return null;
    }
  };
  const getClientStats = useCallback(async (clientId: string): Promise<ClientStats> => {
    const current = scope.current.captureContext(contextKey);
    if (!current() || !salonId) throw new Error('client_context_changed');

    try {
      const client = visibleClients.find(c => c.id === clientId);
      if (!client) throw new Error('client_unavailable');

      const [{ data: transactions, error: transactionError }, { data: appointments, error: appointmentError }] = await Promise.all([
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

      if (!current()) throw new Error('client_context_changed');
      if (transactionError) throw transactionError;
      if (appointmentError) throw appointmentError;
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
      throw error;
    }
  }, [visibleClients, contextKey, salonId]);

  useEffect(() => {
    if (!contextKey) { setSnapshot(null); setReadState(null); return; }
    void fetchClients();
    const channel = supabase.channel(`clients-changes-${salonId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `salon_id=eq.${salonId}` }, () => { void fetchClients(); }).subscribe();
    return () => { scope.current.invalidate(); void supabase.removeChannel(channel); };
  }, [contextKey, salonId, fetchClients]);
  return <ClientsContext.Provider value={{ clients: visibleClients, loading, error, hasSnapshot, contextKey, addClient, updateClient, getClientStats, refreshClients: fetchClients }}>{children}</ClientsContext.Provider>;
}
export function useClients() {
  const value = useContext(ClientsContext);
  if (!value) throw new Error('useClients requires ClientsProvider');
  return value;
}
