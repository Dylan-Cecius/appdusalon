import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface AutomatedReport {
  id: string;
  user_id: string;
  report_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipient_emails: string[];
  report_types: string[];
  is_active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
  time_of_day: string;
  day_of_week: number | null;
  day_of_month: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomatedReportData {
  report_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipient_emails: string[];
  report_types: string[];
  time_of_day: string;
  day_of_week?: number;
  day_of_month?: number;
}

export const useAutomatedReports = () => {
  const [reports, setReports] = useState<AutomatedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchReports = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('automated_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(data as AutomatedReport[] || []);
    } catch (error) {
      console.error('Error fetching automated reports:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les rapports automatisés",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (reportData: CreateAutomatedReportData) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('automated_reports')
        .insert({
          ...reportData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setReports(prev => [data as AutomatedReport, ...prev]);
      toast({
        title: "Succès",
        description: "Rapport automatisé créé avec succès",
      });

      return data;
    } catch (error: any) {
      console.error('Error creating automated report:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le rapport automatisé",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateReport = async (reportId: string, updates: Partial<CreateAutomatedReportData>) => {
    try {
      const { data, error } = await supabase
        .from('automated_reports')
        .update(updates)
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;

      setReports(prev => prev.map(report => 
        report.id === reportId ? data as AutomatedReport : report
      ));

      toast({
        title: "Succès",
        description: "Rapport automatisé mis à jour",
      });

      return data;
    } catch (error: any) {
      console.error('Error updating automated report:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le rapport",
        variant: "destructive",
      });
      throw error;
    }
  };

  const toggleReportStatus = async (reportId: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('automated_reports')
        .update({ is_active: isActive })
        .eq('id', reportId)
        .select()
        .single();

      if (error) throw error;

      setReports(prev => prev.map(report => 
        report.id === reportId ? data as AutomatedReport : report
      ));

      toast({
        title: "Succès",
        description: isActive ? "Rapport activé" : "Rapport désactivé",
      });
    } catch (error: any) {
      console.error('Error toggling report status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du rapport",
        variant: "destructive",
      });
    }
  };

  const deleteReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('automated_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      setReports(prev => prev.filter(report => report.id !== reportId));
      toast({
        title: "Succès",
        description: "Rapport automatisé supprimé",
      });
    } catch (error: any) {
      console.error('Error deleting automated report:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le rapport",
        variant: "destructive",
      });
    }
  };

  const testReport = async (reportId: string) => {
    try {
      console.log('Sending test report for:', reportId);
      toast({
        title: "Envoi en cours...",
        description: "Envoi du rapport de test",
      });

      const { data, error } = await supabase.functions.invoke('send-automated-report', {
        body: { reportId, isTest: true }
      });

      console.log('Test report response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      toast({
        title: "Succès",
        description: data?.message || "Rapport de test envoyé avec succès",
      });
    } catch (error: any) {
      console.error('Error sending test report:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le rapport de test",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  return {
    reports,
    loading,
    createReport,
    updateReport,
    toggleReportStatus,
    deleteReport,
    testReport,
    fetchReports,
  };
};