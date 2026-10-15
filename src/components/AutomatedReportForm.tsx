import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { automatedReportFields, isReportEmail, type AutomatedReport, type CreateAutomatedReportData } from '@/lib/automatedReportConfig';
import { runExclusiveAction } from '@/lib/exclusiveAction';
import { REPORT_TYPES, FREQUENCY_OPTIONS, DAYS_OF_WEEK } from './automatedReportOptions';

interface ReportFormData {
  report_name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipient_emails: string[];
  report_types: string[];
  time_of_day: string;
  day_of_week?: number | null;
  day_of_month?: number | null;
}

export const AutomatedReportForm = ({
  onSubmit,
  editingReport,
  onClose, disabled = false, onPendingChange
}: {
  onSubmit: (data: CreateAutomatedReportData, expectedRevision?: string) => Promise<{ id: string }>;
  editingReport?: AutomatedReport;
  onClose: () => void;
  disabled?: boolean;
  onPendingChange: (pending: boolean) => void;
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
  const [revision] = useState(editingReport?.updated_at);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const handleAddEmail = () => {
    if (saving || disabled) return;
    const email = emailInput.trim();
    if (!isReportEmail(email)) { setError('Indiquez une adresse e-mail valide.'); return; }
    setError(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    await runExclusiveAction(lock, async () => {
      setError(null);
      let fields: CreateAutomatedReportData;
      try {
        if (emailInput.trim()) throw new Error('Ajoutez l’adresse saisie aux destinataires ou effacez-la avant de sauvegarder.');
        fields = automatedReportFields(formData);
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Vérifiez la configuration.'); return; }
      setSaving(true); onPendingChange(true);
      try {
        const saved = await onSubmit(fields, revision);
        if (!saved?.id || (editingReport && saved.id !== editingReport.id)) throw new Error('unconfirmed');
        if (mounted.current) { onPendingChange(false); onClose(); }
      } catch {
        if (mounted.current) setError('Impossible de confirmer la sauvegarde. Votre saisie est conservée. En cas de conflit, fermez puis rouvrez les réglages actualisés avant de réessayer.');
      } finally {
        if (mounted.current) { setSaving(false); onPendingChange(false); }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p role="alert" tabIndex={-1} ref={errorRef} className="text-sm text-destructive">{error}</p>}
      {saving && <p role="status">Enregistrement en cours…</p>}
      <fieldset disabled={saving || disabled} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="report_name">Nom du rapport</Label>
        <Input
          id="report_name"
          value={formData.report_name}
          onChange={(e) => setFormData(prev => ({ ...prev, report_name: e.target.value }))}
          placeholder="Ex: Rapport hebdomadaire"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="report-frequency">Fréquence d'envoi</Label>
        <Select disabled={saving || disabled}
          value={formData.frequency}
          onValueChange={(value: 'daily' | 'weekly' | 'monthly') =>
            setFormData(prev => ({ ...prev, frequency: value }))
          }
        >
          <SelectTrigger id="report-frequency" aria-label="Fréquence d’envoi">
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
        <Label htmlFor="time_of_day">Heure d'envoi</Label>
        <Input
          id="time_of_day"
          type="time"
          step="1"
          value={formData.time_of_day}
          onChange={(e) => setFormData(prev => ({ ...prev, time_of_day: e.target.value }))}
          required
        />
      </div>

      {formData.frequency === 'weekly' && (
        <div className="space-y-2">
          <Label htmlFor="report-day">Jour de la semaine</Label>
          <Select disabled={saving || disabled}
            value={formData.day_of_week?.toString()}
            onValueChange={(value) =>
              setFormData(prev => ({ ...prev, day_of_week: parseInt(value) }))
            }
          >
            <SelectTrigger id="report-day" aria-label="Jour de la semaine">
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
          <Label htmlFor="day_of_month">Jour du mois (1-28)</Label>
          <Input
            id="day_of_month"
            type="number"
            min="1"
            max="28"
            value={formData.day_of_month || 1}
            onChange={(e) => setFormData(prev => ({ ...prev, day_of_month: parseInt(e.target.value) }))}
            required
          />
        </div>
      )}

      <div className="space-y-3">
        <Label>Types de rapports à inclure</Label>
        <div className="grid grid-cols-1 gap-3">
          {REPORT_TYPES.map(reportType => {
            const IconComponent = reportType.icon;
            return (
              <div key={reportType.id} className="flex items-center space-x-2">
                <Checkbox
                  disabled={saving || disabled}
                  id={reportType.id}
                  checked={formData.report_types.includes(reportType.id)}
                  onCheckedChange={(checked) =>
                    handleReportTypeChange(reportType.id, checked as boolean)
                  }
                />
                <IconComponent className="h-4 w-4" />
                <Label htmlFor={reportType.id}>{reportType.label}</Label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Destinataires</Label>
        <div className="flex gap-2">
          <Input
            aria-label="Adresse du destinataire"
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
          <Button aria-label="Ajouter le destinataire" type="button" onClick={handleAddEmail} variant="outline">
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
                aria-label={`Retirer ${email}`}
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
          {saving ? 'Enregistrement…' : editingReport ? 'Mettre à jour' : 'Créer le rapport'}
        </Button>
      </div>
      </fieldset>
    </form>
  );
};
