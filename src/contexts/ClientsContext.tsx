import { normalizeClientAppointment, type ClientAppointment } from '@/lib/clientAppointments';
import { readClientStats, type ClientStatsTransaction } from '@/lib/clientStats';
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
  getClientAppointments: (id: string) => Promise<ClientAppointment[]>;
  refreshClients: () => Promise<void>;
  captureContext: () => () => boolean;
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
  const [statsRevision, setStatsRevision] = useState(0);
  const statsRevisionRef = useRef(statsRevision);
  statsRevisionRef.current = statsRevision;
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
    const contextIsCurrent = scope.current.captureContext(contextKey);
    const current = () => contextIsCurrent() && statsRevisionRef.current === statsRevision;
    if (!current() || !salonId || !hasSnapshot || error) throw new Error('client_context_unavailable');
    const client = visibleClients.find(row => row.id === clientId);
    if (!client) throw new Error('client_unavailable');
    const now = new Date();
    const result = await readClientStats(async (from, to) => {
      const response = await supabase.from('transactions').select('id, total_amount, transaction_date, appointment_id', { count: 'exact' })
        .eq('client_id', clientId).eq('salon_id', salonId).lte('transaction_date', now.toISOString()).order('transaction_date').order('id').range(from, to);
      // appointment_id exists in the split-payment migration; the generated schema predates it.
      return { ...response, data: response.data as unknown as ClientStatsTransaction[] | null };
    }, async (from, to) => {
      return await supabase.from('appointments').select('id, start_time, status', { count: 'exact' })
        .eq('salon_id', salonId).eq('client_phone', client.phone).eq('status', 'completed').lte('start_time', now.toISOString()).order('start_time').order('id').range(from, to);
    }, current, now);
    if (!current() || result === null) throw new Error('client_context_changed');
    return result;
  }, [visibleClients, contextKey, salonId, hasSnapshot, error, statsRevision]);

  const getClientAppointments = useCallback(async (clientId: string): Promise<ClientAppointment[]> => {
    const contextIsCurrent = scope.current.captureContext(contextKey);
    const current = () => contextIsCurrent() && statsRevisionRef.current === statsRevision;
    if (!current() || !salonId || !hasSnapshot || error) throw new Error('client_context_unavailable');
    const client = visibleClients.find(row => row.id === clientId);
    if (!client) throw new Error('client_unavailable');
    const rows = await readCompleteRows(async (from, to) => {
      return await supabase.from('appointments').select('id, client_name, client_phone, start_time, end_time, services, status, total_price, is_paid', { count: 'exact' })
        .eq('salon_id', salonId).eq('client_phone', client.phone).order('start_time').order('id').range(from, to);
    }, current);
    if (!current() || rows === null) throw new Error('client_context_changed');
    return rows.map(normalizeClientAppointment);
  }, [contextKey, salonId, hasSnapshot, error, visibleClients, statsRevision]);

  useEffect(() => {
    const requestScope = scope.current;
    if (!contextKey) { setSnapshot(null); setReadState(null); return; }
    void fetchClients();
    const channel = supabase.channel(`clients-changes-${salonId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `salon_id=eq.${salonId}` }, () => { void fetchClients(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `salon_id=eq.${salonId}` }, () => setStatsRevision(value => value + 1))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `salon_id=eq.${salonId}` }, () => setStatsRevision(value => value + 1))
      .subscribe();
    return () => { requestScope.invalidate(); void supabase.removeChannel(channel); };
  }, [contextKey, salonId, fetchClients]);
  return <ClientsContext.Provider value={{ clients: visibleClients, loading, error, hasSnapshot, contextKey, addClient, updateClient, getClientStats, getClientAppointments, refreshClients: fetchClients, captureContext: () => scope.current.captureContext(contextKey) }}>{children}</ClientsContext.Provider>;
}
export function useClients() {
  const value = useContext(ClientsContext);
  if (!value) throw new Error('useClients requires ClientsProvider');
  return value;
}
