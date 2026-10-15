import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { createLatestRequestScope } from '@/lib/latestRequestScope';
import { readCompleteRows } from '@/lib/readCompleteRows';

import { automatedReportFields, type AutomatedReport, type CreateAutomatedReportData } from '@/lib/automatedReportConfig';
export type { AutomatedReport, CreateAutomatedReportData } from '@/lib/automatedReportConfig';

const emptyReports: AutomatedReport[] = [];
export const useAutomatedReports = () => {
  const { user, isReady } = useAuth();
  const { toast } = useToast();
  // Existing schema owns configurations by user_id; sending resolves that owner's salon server-side.
  const contextKey = isReady && user ? user.id : null;
  const scope = useRef(createLatestRequestScope());
  scope.current.setContext(contextKey);
  const [snapshot, setSnapshot] = useState<{ context: string; reports: AutomatedReport[] } | null>(null);
  const [readState, setReadState] = useState<{ context: string; loading: boolean; error: string | null } | null>(null);
  const hasSnapshot = !!contextKey && snapshot?.context === contextKey;
  const reports = hasSnapshot ? snapshot.reports : emptyReports;
  const error = readState?.context === contextKey ? readState.error : null;
  const loading = !isReady || (!!contextKey && (readState?.context !== contextKey || readState.loading));
  const fetchReports = useCallback(async () => {
    const current = scope.current.begin(contextKey);
    if (!contextKey || !current) return;
    setReadState({ context: contextKey, loading: true, error: null });
    try {
      const rows = await readCompleteRows(async (from, to) => await supabase.from('automated_reports').select('*', { count: 'exact' }).eq('user_id', contextKey).order('created_at', { ascending: false }).order('id').range(from, to), current);
      if (!current() || !rows) return;
      if (rows.some(row => row.user_id !== contextKey)) throw new Error('report_owner_mismatch');
      setSnapshot({ context: contextKey, reports: rows as AutomatedReport[] });
      setReadState({ context: contextKey, loading: false, error: null });
    } catch {
      if (current()) setReadState({ context: contextKey, loading: false, error: 'Impossible de charger tous les rapports. Réessayez avant de les modifier.' });
    }
  }, [contextKey]);
  useEffect(() => {
    const requestScope = scope.current;
    void fetchReports();
    return () => requestScope.invalidate();
  }, [fetchReports]);
  const mutationContext = () => {
    const current = scope.current.captureContext(contextKey);
    if (!current() || !contextKey || loading || error || !hasSnapshot) throw new Error('report_context_unavailable');
    return { current, owner: contextKey };
  };
  const storeReport = (report: AutomatedReport, owner: string) => {
    setSnapshot(previous => previous?.context === owner ? { ...previous, reports: previous.reports.some(row => row.id === report.id) ? previous.reports.map(row => row.id === report.id ? report : row) : [report, ...previous.reports] } : previous);
    // Supersede any read started before the confirmed mutation.
    void fetchReports();
  };
  const createReport = async (reportData: CreateAutomatedReportData) => {
    const { current, owner } = mutationContext();
    const { data, error } = await supabase.from('automated_reports').insert({ ...automatedReportFields(reportData), user_id: owner }).select().single();
    if (error) throw error;
    if (!current() || !data?.id || data.user_id !== owner) throw new Error('report_create_not_confirmed');
    storeReport(data as AutomatedReport, owner);
    return data as AutomatedReport;
  };
  const updateReport = async (reportId: string, updates: CreateAutomatedReportData, expectedRevision: string) => {
    const { current, owner } = mutationContext();
    if (!expectedRevision) throw new Error('report_revision_required');
    const { data, error } = await supabase.from('automated_reports').update(automatedReportFields(updates)).eq('id', reportId).eq('user_id', owner).eq('updated_at', expectedRevision).select().single();
    if (error) throw error;
    if (!current() || data?.id !== reportId || data.user_id !== owner) throw new Error('report_update_not_confirmed');
    storeReport(data as AutomatedReport, owner);
    return data as AutomatedReport;
  };
  const toggleReportStatus = async (reportId: string, isActive: boolean) => {
    const current = scope.current.captureContext(contextKey);
    try {
      const { owner } = mutationContext();
      const { data, error } = await supabase.from('automated_reports').update({ is_active: isActive }).eq('id', reportId).eq('user_id', owner).select().single();
      if (error) throw error;
      if (!current()) return;
      if (data?.id !== reportId || data.user_id !== owner || data.is_active !== isActive) throw new Error('report_status_not_confirmed');
      storeReport(data as AutomatedReport, owner);
      toast({ title: isActive ? 'Rapport activé' : 'Rapport désactivé' });
    } catch { if (current()) toast({ title: 'Erreur', description: 'Impossible de confirmer le statut du rapport.', variant: 'destructive' }); }
  };
  const deleteReport = async (reportId: string) => {
    const current = scope.current.captureContext(contextKey);
    try {
      const { owner } = mutationContext();
      const { data, error } = await supabase.from('automated_reports').delete().eq('id', reportId).eq('user_id', owner).select('id,user_id').maybeSingle();
      if (error) throw error;
      if (!current()) return;
      if (data?.id !== reportId || data.user_id !== owner) throw new Error('report_delete_not_confirmed');
      setSnapshot(previous => previous?.context === owner ? { ...previous, reports: previous.reports.filter(row => row.id !== reportId) } : previous);
      void fetchReports();
      toast({ title: 'Rapport supprimé' });
    } catch { if (current()) toast({ title: 'Erreur', description: 'Impossible de confirmer la suppression du rapport.', variant: 'destructive' }); }
  };
  const testReport = async (reportId: string) => {
    const current = scope.current.captureContext(contextKey);
    try {
      mutationContext();
      if (!reports.some(report => report.id === reportId)) throw new Error('report_not_loaded');
      const { data, error } = await supabase.functions.invoke('send-automated-report', { body: { reportId, isTest: true } });
      if (error) throw error;
      if (!current()) return;
      if (data?.success !== true || !Number.isInteger(data.emailsSent) || data.emailsSent <= 0 || data.emailsError !== 0) throw new Error('report_delivery_not_confirmed');
      toast({ title: 'Envoi signalé par le serveur', description: data.message });
    } catch { if (current()) toast({ title: 'Erreur', description: "Impossible de confirmer l’envoi complet. Vérifiez les envois avant de réessayer.", variant: 'destructive' }); }
  };
  return { reports, loading, error, hasSnapshot, createReport, updateReport, toggleReportStatus, deleteReport, testReport, fetchReports };
};
