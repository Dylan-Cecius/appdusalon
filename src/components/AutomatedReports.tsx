import { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, Clock, Trash2, Play, Edit, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAutomatedReports, type AutomatedReport } from "@/hooks/useAutomatedReports";
import { useFeatureAccess } from "@/components/FeatureGate";
import { useAuth } from '@/hooks/useAuth';
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";

import { AutomatedReportForm } from './AutomatedReportForm';
import { REPORT_TYPES, FREQUENCY_OPTIONS } from './automatedReportOptions';

const ReportCard = ({ report, actions, disabled }: { report: AutomatedReport; actions: ReturnType<typeof useAutomatedReports>; disabled: boolean }) => {
  const { toggleReportStatus, deleteReport, testReport, updateReport } = actions;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const onPendingChange = (value: boolean) => { pendingRef.current = value; setPending(value); };

  const runAction = async (action: () => Promise<void>) => {
    if (disabled || pendingRef.current) return;
    onPendingChange(true);
    try { await action(); } finally { onPendingChange(false); }
  };

  const getFrequencyLabel = (frequency: string) => {
    const option = FREQUENCY_OPTIONS.find(o => o.value === frequency);
    return option?.label || frequency;
  };

  const getNextSendDate = (report: AutomatedReport) => {
    if (!report.next_send_at) return 'Non planifié';
    
    try {
      // Utiliser formatInTimeZone pour afficher correctement en heure belge
      return formatInTimeZone(
        new Date(report.next_send_at), 
        'Europe/Brussels', 
        "dd MMMM yyyy 'à' HH:mm", 
        { locale: fr }
      );
    } catch {
      return 'Date invalide';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{report.report_name}</h3>
          <p className="text-sm text-muted-foreground">
            {getFrequencyLabel(report.frequency)} • {report.time_of_day}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            disabled={disabled || pending}
            aria-label={`Activer ${report.report_name}`}
            checked={report.is_active}
            onCheckedChange={(checked) => void runAction(() => toggleReportStatus(report.id, checked))}
          />
          <Badge variant={report.is_active ? "default" : "secondary"}>
            {report.is_active ? 'Actif' : 'Inactif'}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          <span>Prochain envoi: {getNextSendDate(report)}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4" />
          <span>{report.recipient_emails.length} destinataire(s)</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {report.report_types.map(type => {
            const reportType = REPORT_TYPES.find(t => t.id === type);
            return (
              <Badge key={type} variant="outline" className="text-xs">
                {reportType?.label || type}
              </Badge>
            );
          })}
        </div>
      </div>

      {pending && <p role="status" className="mb-2 text-sm">Opération en cours…</p>}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || pending}
          onClick={() => void runAction(() => testReport(report.id))}
        >
          <Play className="h-3 w-3 mr-1" />
          Test
        </Button>
        
        <Dialog open={editDialogOpen} onOpenChange={open => { if (!pendingRef.current) setEditDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button disabled={disabled || pending} variant="outline" size="sm">
              <Edit className="h-3 w-3 mr-1" />
              Modifier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le rapport automatisé</DialogTitle>
              <DialogDescription>
                Modifiez la configuration de votre rapport automatisé.
              </DialogDescription>
            </DialogHeader>
            <AutomatedReportForm
              disabled={disabled}
              onPendingChange={onPendingChange}
              onSubmit={(data, revision) => updateReport(report.id, data, revision!)}
              editingReport={report}
              onClose={() => setEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Button
          variant="destructive"
          size="sm"
          disabled={disabled || pending} aria-label={`Supprimer ${report.report_name}`}
          onClick={() => void runAction(() => deleteReport(report.id))}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
};

const AutomatedReportsWorkspace = () => {
  const actions = useAutomatedReports();
  const { reports, loading, error, hasSnapshot, fetchReports, createReport } = actions;
  const disabled = loading || !!error || !hasSnapshot;
  const { checkFeature } = useFeatureAccess();
  const [dialogOpen, setDialogOpen] = useState(false);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const onPendingChange = (value: boolean) => { pendingRef.current = value; setPending(value); };

  const canExportReports = checkFeature('canExportReports');

  if (!canExportReports) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Rapports automatisés
          </CardTitle>
          <CardDescription>
            Cette fonctionnalité est disponible avec le plan Équipe.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading && !hasSnapshot) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" disabled={loading || pending} onClick={() => void fetchReports()}>Actualiser les rapports</Button>
      {error && <Card className="p-4"><p role="alert">{error}</p><Button variant="outline" onClick={() => void fetchReports()}>Recharger les rapports</Button></Card>}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Rapports automatisés
              </CardTitle>
              <CardDescription>
                Configurez l'envoi automatique de rapports par email
              </CardDescription>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={open => { if (!pendingRef.current) setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button disabled={disabled || pending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau rapport
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Créer un rapport automatisé</DialogTitle>
                  <DialogDescription>
                    Configurez un nouveau rapport qui sera envoyé automatiquement par email.
                  </DialogDescription>
                </DialogHeader>
                <AutomatedReportForm
                  disabled={disabled}
                  onPendingChange={onPendingChange}
                  onSubmit={createReport}
                  onClose={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {reports.length === 0 && !error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun rapport configuré</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier rapport automatisé pour recevoir des mises à jour régulières.
            </p>
            <Dialog open={dialogOpen} onOpenChange={open => { if (!pendingRef.current) setDialogOpen(open); }}>
              <DialogTrigger asChild>
                <Button disabled={disabled || pending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un rapport
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map(report => (
            <ReportCard key={report.id} report={report} actions={actions} disabled={disabled || pending} />
          ))}
        </div>
      )}
    </div>
  );
};

export const AutomatedReports = () => {
  const { user } = useAuth();
  return <AutomatedReportsWorkspace key={user?.id ?? 'anonymous'} />;
};
export default AutomatedReports;