import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Mail, 
  Clock, 
  Calendar, 
  BarChart3, 
  DollarSign, 
  Users,
  Trash2,
  Play,
  Edit,
  Settings
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAutomatedReports, CreateAutomatedReportData, AutomatedReport } from "@/hooks/useAutomatedReports";
import { useFeatureAccess } from "@/components/FeatureGate";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { fr } from "date-fns/locale";

const REPORT_TYPES = [
  { id: 'revenue', label: 'Revenus et ventes', icon: DollarSign },
  { id: 'appointments', label: 'Rendez-vous', icon: Calendar },
  { id: 'stats', label: 'Statistiques avancées', icon: BarChart3 },
  { id: 'clients', label: 'Données clients', icon: Users },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 7, label: 'Dimanche' },
];

interface ReportFormData {
  report_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipient_emails: string[];
  report_types: string[];
  time_of_day: string;
  day_of_week?: number;
  day_of_month?: number;
}

const AutomatedReportForm = ({ 
  onSubmit, 
  editingReport,
  onClose 
}: { 
  onSubmit: (data: CreateAutomatedReportData) => void;
  editingReport?: AutomatedReport;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState<ReportFormData>({
    report_name: editingReport?.report_name || '',
    frequency: editingReport?.frequency || 'weekly',
    recipient_emails: editingReport?.recipient_emails || [],
    report_types: editingReport?.report_types || [],
    time_of_day: editingReport?.time_of_day || '09:00',
    day_of_week: editingReport?.day_of_week || 1,
    day_of_month: editingReport?.day_of_month || 1,
  });

  const [emailInput, setEmailInput] = useState('');

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (email && !formData.recipient_emails.includes(email)) {
      setFormData(prev => ({
        ...prev,
        recipient_emails: [...prev.recipient_emails, email]
      }));
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      recipient_emails: prev.recipient_emails.filter(e => e !== email)
    }));
  };

  const handleReportTypeChange = (reportType: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      report_types: checked 
        ? [...prev.report_types, reportType]
        : prev.report_types.filter(t => t !== reportType)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <Label htmlFor="report_name" className="text-sm sm:text-base">Nom du rapport</Label>
        <Input
          id="report_name"
          value={formData.report_name}
          onChange={(e) => setFormData(prev => ({ ...prev, report_name: e.target.value }))}
          placeholder="Ex: Rapport hebdomadaire"
          required
          className="min-h-[44px] text-base"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm sm:text-base">Fréquence d'envoi</Label>
        <Select 
          value={formData.frequency} 
          onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
            setFormData(prev => ({ ...prev, frequency: value }))
          }
        >
          <SelectTrigger className="min-h-[44px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="time_of_day" className="text-sm sm:text-base">Heure d'envoi</Label>
        <Input
          id="time_of_day"
          type="time"
          value={formData.time_of_day}
          onChange={(e) => setFormData(prev => ({ ...prev, time_of_day: e.target.value }))}
          required
          className="min-h-[44px] text-base"
        />
      </div>

      {formData.frequency === 'weekly' && (
        <div className="space-y-2">
          <Label className="text-sm sm:text-base">Jour de la semaine</Label>
          <Select 
            value={formData.day_of_week?.toString()} 
            onValueChange={(value) => 
              setFormData(prev => ({ ...prev, day_of_week: parseInt(value) }))
            }
          >
            <SelectTrigger className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS_OF_WEEK.map(day => (
                <SelectItem key={day.value} value={day.value.toString()}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.frequency === 'monthly' && (
        <div className="space-y-2">
          <Label htmlFor="day_of_month" className="text-sm sm:text-base">Jour du mois (1-28)</Label>
          <Input
            id="day_of_month"
            type="number"
            min="1"
            max="28"
            value={formData.day_of_month || 1}
            onChange={(e) => setFormData(prev => ({ ...prev, day_of_month: parseInt(e.target.value) }))}
            required
            className="min-h-[44px] text-base"
          />
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-sm sm:text-base">Types de rapports à inclure</Label>
        <div className="grid grid-cols-1 gap-3">
          {REPORT_TYPES.map(reportType => {
            const IconComponent = reportType.icon;
            return (
              <div key={reportType.id} className="flex items-center space-x-2 min-h-[44px]">
                <Checkbox
                  id={reportType.id}
                  checked={formData.report_types.includes(reportType.id)}
                  onCheckedChange={(checked) => 
                    handleReportTypeChange(reportType.id, checked as boolean)
                  }
                  className="h-5 w-5"
                />
                <IconComponent className="h-4 w-4" />
                <Label htmlFor={reportType.id} className="text-sm sm:text-base cursor-pointer">{reportType.label}</Label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Destinataires</Label>
        <div className="flex gap-2">
          <Input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="email@exemple.com"
            type="email"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddEmail();
              }
            }}
          />
          <Button type="button" onClick={handleAddEmail} variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.recipient_emails.map(email => (
            <Badge key={email} variant="secondary" className="flex items-center gap-1">
              {email}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => handleRemoveEmail(email)}
              >
                ×
              </Button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" disabled={!formData.report_name || formData.report_types.length === 0 || formData.recipient_emails.length === 0}>
          {editingReport ? 'Mettre à jour' : 'Créer le rapport'}
        </Button>
      </div>
    </form>
  );
};

const ReportCard = ({ report }: { report: AutomatedReport }) => {
  const { toggleReportStatus, deleteReport, testReport, updateReport } = useAutomatedReports();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const getFrequencyLabel = (frequency: string) => {
    const option = FREQUENCY_OPTIONS.find(o => o.value === frequency);
    return option?.label || frequency;
  };

  const getNextSendDate = (report: AutomatedReport) => {
    if (!report.next_send_at) return 'Non planifié';
    
    try {
      // Utiliser formatInTimeZone pour afficher correctement en heure française
      return formatInTimeZone(
        new Date(report.next_send_at), 
        'Europe/Paris', 
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
            checked={report.is_active}
            onCheckedChange={(checked) => toggleReportStatus(report.id, checked)}
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

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => testReport(report.id)}
        >
          <Play className="h-3 w-3 mr-1" />
          Test
        </Button>
        
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
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
              onSubmit={(data) => updateReport(report.id, data)}
              editingReport={report}
              onClose={() => setEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => deleteReport(report.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
};

export const AutomatedReports = () => {
  const { reports, loading, createReport } = useAutomatedReports();
  const { checkFeature } = useFeatureAccess();
  const [dialogOpen, setDialogOpen] = useState(false);

  const canSendEmails = checkFeature('canSendEmails');

  if (!canSendEmails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Rapports automatisés
          </CardTitle>
          <CardDescription>
            Cette fonctionnalité nécessite un plan Premium ou supérieur.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
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
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
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
                  onSubmit={createReport}
                  onClose={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun rapport configuré</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier rapport automatisé pour recevoir des mises à jour régulières.
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
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
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AutomatedReports;