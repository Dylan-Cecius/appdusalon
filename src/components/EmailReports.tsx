import { runExclusiveAction } from '@/lib/exclusiveAction';
import { buildPaymentReportText, type PaymentReportType } from '@/lib/paymentReportText';
import { paymentReportFilters, type PaymentFilter } from '@/lib/paymentReports';
import { toZonedTime } from 'date-fns-tz';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, Calendar, Info } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useAuth } from '@/hooks/useAuth';

const EmailReports = () => {
  const { user } = useAuth();
  const { transactions, loading: transactionsLoading, error: transactionsError, hasSnapshot } = useSupabaseTransactions();
  
  const [email, setEmail] = useState('');
  const [reportType, setReportType] = useState<PaymentReportType>('daily');
  const [dateRangePreset, setDateRangePreset] = useState<'current_week' | 'current_month' | 'previous_month' | 'last_3_months' | 'custom'>('current_week');
  const [selectedDate, setSelectedDate] = useState(format(toZonedTime(new Date(), 'Europe/Brussels'), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(toZonedTime(new Date(), 'Europe/Brussels'), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(toZonedTime(new Date(), 'Europe/Brussels'), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<PaymentFilter>('all');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const sending = useRef(false);

  // Apply date range preset
  const getPresetDateRange = useCallback(() => {
    const now = toZonedTime(new Date(), 'Europe/Brussels');
    switch (dateRangePreset) {
      case 'current_week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'previous_month': {
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      }
      case 'last_3_months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'custom':
        return { start: startOfDay(parseISO(startDate)), end: endOfDay(parseISO(endDate)) };
    }
  }, [dateRangePreset, startDate, endDate]);

  // Pré-remplir l'email avec l'adresse de l'utilisateur connecté au chargement initial
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const reportPreview = useMemo(() => {
    try {
      const range = reportType === 'daily'
        ? { start: startOfDay(parseISO(selectedDate)), end: endOfDay(parseISO(selectedDate)) }
        : getPresetDateRange();
      return { report: buildPaymentReportText({ transactions, ...range, type: reportType, filter: paymentMethod, message }), error: null };
    } catch (failure) {
      return { report: null, error: failure instanceof Error ? failure.message : 'Rapport indisponible.' };
    }
  }, [transactions, reportType, selectedDate, getPresetDateRange, paymentMethod, message]);

  const handleSendReport = () => runExclusiveAction(sending, async () => {
    if (!email) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une adresse email",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une adresse email valide",
        variant: "destructive",
      });
      return;
    }

    if (!reportPreview.report || transactionsLoading || transactionsError || !hasSnapshot) return;
    setIsLoading(true);

    try {
      const { subject, content } = reportPreview.report;
      
      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: {
          to: email,
          subject: subject,
          content: content,
          reportType: reportType
        }
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de l\'envoi');
      }

      if (!data?.success) {
        throw new Error(data?.error || data?.details || 'Erreur lors de l\'envoi');
      }

      toast({
        title: "✅ Rapport envoyé !",
        description: `Le rapport a été envoyé avec succès à ${email}`,
      });

      // Reset form
      setEmail('');
      setMessage('');
      
    } catch (error: any) {
      console.error('Erreur d\'envoi email:', error);
      let errorMessage = "Impossible d'envoyer le rapport par email";
      let errorTitle = "❌ Erreur d'envoi";
      
      // Gestion détaillée des erreurs Resend
      if (error.message?.includes("You can only send testing emails to your own email address") || 
          error.message?.includes("403")) {
        errorTitle = "⚠️ Domaine non vérifié";
        errorMessage = `Vous ne pouvez envoyer des emails qu'à votre propre adresse en mode test Resend.\n\nPour envoyer à d'autres destinataires (comptable, etc.), veuillez :\n1. Aller sur resend.com/domains\n2. Vérifier votre domaine d'envoi\n3. Réessayer l'envoi`;
      } else if (error.message?.includes("domain")) {
        errorTitle = "⚠️ Configuration requise";
        errorMessage = "Votre domaine email n'est pas validé sur Resend. Veuillez vérifier votre domaine sur resend.com/domains pour envoyer à des tiers.";
      } else if (error.message?.includes("API key") || error.message?.includes("401")) {
        errorTitle = "🔑 Clé API invalide";
        errorMessage = "La clé API Resend est incorrecte ou manquante. Veuillez vérifier la configuration dans les paramètres de votre projet.";
      } else if (error.message?.includes("rate limit") || error.message?.includes("429")) {
        errorTitle = "⏱️ Limite atteinte";
        errorMessage = "Vous avez atteint la limite d'envoi d'emails. Veuillez réessayer dans quelques minutes.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 8000, // Affichage plus long pour les messages d'erreur détaillés
      });
    } finally {
      setIsLoading(false);
    }
  });

  const previewContent = reportPreview.report?.content || '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Mail className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-primary">Envoi de rapports</h3>
            <p className="text-sm text-muted-foreground">Générez et envoyez vos statistiques par email</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm sm:text-base">Adresse email du destinataire *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="destinataire@email.com"
              required
              className="min-h-[44px] w-full"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Par défaut : votre adresse ({user?.email}). Modifiez pour envoyer à un comptable ou collaborateur.
            </p>
          </div>

          <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
              <strong>Note importante :</strong> Pour envoyer des rapports à d'autres adresses que la vôtre, 
              votre domaine doit être vérifié sur Resend. Sinon, seuls les envois vers {user?.email} fonctionneront.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="reportType">Type de rapport</Label>
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type de rapport" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="daily">Rapport journalier</SelectItem>
                <SelectItem value="weekly">Rapport hebdomadaire</SelectItem>
                <SelectItem value="monthly">Rapport mensuel</SelectItem>
                <SelectItem value="custom">Période personnalisée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType !== 'daily' && (
            <div>
              <Label htmlFor="dateRangePreset" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Plage de dates
              </Label>
              <Select value={dateRangePreset} onValueChange={(value: any) => setDateRangePreset(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner la plage" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="current_week">Semaine en cours</SelectItem>
                  <SelectItem value="current_month">Mois en cours</SelectItem>
                  <SelectItem value="previous_month">Mois précédent</SelectItem>
                  <SelectItem value="last_3_months">3 derniers mois</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
              {dateRangePreset !== 'custom' && (
                <p className="text-sm text-muted-foreground mt-1">
                  {format(getPresetDateRange().start, 'dd/MM/yyyy')} — {format(getPresetDateRange().end, 'dd/MM/yyyy')}
                </p>
              )}
            </div>
          )}

          {reportType === 'daily' && (
            <div>
              <Label htmlFor="email-selectedDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date du rapport journalier
              </Label>
              <Input
                id="email-selectedDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          {reportType !== 'daily' && dateRangePreset === 'custom' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email-startDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date de début
                  </Label>
                  <Input
                    id="email-startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email-endDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date de fin
                  </Label>
                  <Input
                    id="email-endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                  />
                </div>
              </div>

            </>
          )}

          <div>
            <Label className="mb-3 block">Part de paiement</Label>
            <RadioGroup value={paymentMethod} onValueChange={(value: PaymentFilter) => setPaymentMethod(value)} className="flex flex-wrap gap-3">
              {paymentReportFilters.map(option => <div key={option.key} className="flex items-center gap-2">
                <RadioGroupItem value={option.key} id={`email-payment-${option.key}`} />
                <Label htmlFor={`email-payment-${option.key}`}>{option.label}</Label>
              </div>)}
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="message">Message personnalisé (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ajoutez des notes ou commentaires..."
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSendReport}
            disabled={isLoading || !email || !reportPreview.report || transactionsLoading || !!transactionsError || !hasSnapshot}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? 'Envoi en cours...' : 'Envoyer le rapport'}
          </Button>
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4 text-primary flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Aperçu du rapport
        </h4>
        
        {reportPreview.error && <p role="alert" className="mb-3 text-sm text-destructive">{reportPreview.error}</p>}
        <div className="bg-muted/20 p-4 rounded-lg max-h-96 overflow-y-auto">
          <pre className="text-sm whitespace-pre-wrap font-mono">
            {previewContent}
          </pre>
        </div>
      </Card>
    </div>
  );
};

export default EmailReports;