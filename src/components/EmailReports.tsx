import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, Calendar, Info } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useAuth } from '@/hooks/useAuth';

interface StatsData {
  todayRevenue: number;
  todayClients: number;
  weeklyRevenue: number;
  weeklyClients: number;
  monthlyRevenue: number;
  monthlyClients: number;
  paymentStats: {
    today: {
      cash: number;
      card: number;
      cashPercent: number;
      cardPercent: number;
    };
    weekly: {
      cash: number;
      card: number;
      cashPercent: number;
      cardPercent: number;
    };
    monthly: {
      cash: number;
      card: number;
      cashPercent: number;
      cardPercent: number;
    };
  };
}

interface EmailReportsProps {
  statsData: StatsData;
}

const EmailReports = ({ statsData }: EmailReportsProps) => {
  const { user } = useAuth();
  const { transactions } = useSupabaseTransactions();
  const { appointments } = useSupabaseAppointments();
  
  const [email, setEmail] = useState('');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [dateRangePreset, setDateRangePreset] = useState<'current_week' | 'current_month' | 'previous_month' | 'last_3_months' | 'custom'>('current_week');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'card'>('all');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Apply date range preset
  const getPresetDateRange = () => {
    const now = new Date();
    switch (dateRangePreset) {
      case 'current_week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'current_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'previous_month':
        const prevMonth = subMonths(now, 1);
        return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) };
      case 'last_3_months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'custom':
        return { start: startOfDay(new Date(startDate)), end: endOfDay(new Date(endDate)) };
    }
  };

  // Pré-remplir l'email avec l'adresse de l'utilisateur connecté au chargement initial
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Calculate custom stats based on date range and payment method
  const customStats = useMemo(() => {
    if (reportType === 'daily') return null;

    const { start, end } = getPresetDateRange();

    // Filter transactions
    const filteredTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      const matchesDate = txDate >= start && txDate <= end;
      const matchesPayment = paymentMethod === 'all' || tx.paymentMethod === paymentMethod;
      return matchesDate && matchesPayment;
    });

    // Filter appointments
    const filteredAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      const matchesDate = aptDate >= start && aptDate <= end && apt.isPaid;
      return matchesDate; // Appointments don't have payment method in the data
    });

    const cashCount = filteredTransactions.filter(tx => tx.paymentMethod === 'cash').length;
    const cardCount = filteredTransactions.filter(tx => tx.paymentMethod === 'card').length;
    const totalTransactions = filteredTransactions.length;

    return {
      revenue: filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0) +
               filteredAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0),
      clients: filteredTransactions.length + filteredAppointments.length,
      cash: cashCount,
      card: cardCount,
      cashPercent: totalTransactions > 0 ? (cashCount / totalTransactions) * 100 : 0,
      cardPercent: totalTransactions > 0 ? (cardCount / totalTransactions) * 100 : 0,
    };
  }, [reportType, dateRangePreset, startDate, endDate, paymentMethod, transactions, appointments]);

  const generateReport = () => {
    const currentDate = new Date(selectedDate);
    const formattedDate = format(currentDate, 'dd MMMM yyyy', { locale: fr });
    
    let reportContent = '';
    let subject = '';
    
    // Determine date range based on report type
    let dateRange = { start: new Date(), end: new Date() };
    
    switch (reportType) {
      case 'daily':
        dateRange = {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate)
        };
        break;
      case 'weekly':
      case 'monthly':
      case 'custom':
        dateRange = getPresetDateRange();
        break;
    }
    
    // Calculate daily breakdown for the table
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    const dailyData = days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const dayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.transactionDate);
        return txDate >= dayStart && txDate <= dayEnd;
      });
      
      const dayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.startTime);
        return aptDate >= dayStart && aptDate <= dayEnd && apt.isPaid;
      });
      
      const filteredTransactions = paymentMethod === 'all' 
        ? dayTransactions 
        : dayTransactions.filter(tx => tx.paymentMethod === paymentMethod);
      
      const cashAmount = filteredTransactions
        .filter(tx => tx.paymentMethod === 'cash')
        .reduce((sum, tx) => sum + tx.totalAmount, 0);
        
      const cardAmount = filteredTransactions
        .filter(tx => tx.paymentMethod === 'card')
        .reduce((sum, tx) => sum + tx.totalAmount, 0);
      
      const appointmentAmount = paymentMethod === 'all' 
        ? dayAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0)
        : 0;
      
      return {
        date: day,
        transactions: filteredTransactions.length + (paymentMethod === 'all' ? dayAppointments.length : 0),
        cashAmount,
        cardAmount,
        totalAmount: cashAmount + cardAmount + appointmentAmount
      };
    });
    
    // Calculate totals
    const totals = dailyData.reduce((acc, day) => ({
      transactions: acc.transactions + day.transactions,
      cashAmount: acc.cashAmount + day.cashAmount,
      cardAmount: acc.cardAmount + day.cardAmount,
      totalAmount: acc.totalAmount + day.totalAmount
    }), { transactions: 0, cashAmount: 0, cardAmount: 0, totalAmount: 0 });
    
    // Generate table in text format
    const paymentFilter = paymentMethod === 'all' ? 'Tous' : paymentMethod === 'cash' ? 'Espèces uniquement' : 'Bancontact uniquement';
    let tableContent = `\n📋 DÉTAIL JOUR PAR JOUR\n`;
    tableContent += `Filtre de paiement : ${paymentFilter}\n\n`;
    
    // Table header
    tableContent += `Date          | Trans. |`;
    if (paymentMethod === 'all' || paymentMethod === 'cash') {
      tableContent += ` Cash    |`;
    }
    if (paymentMethod === 'all' || paymentMethod === 'card') {
      tableContent += ` Bancont. |`;
    }
    tableContent += ` Total\n`;
    tableContent += `${'='.repeat(50)}\n`;
    
    // Table rows
    dailyData.forEach(day => {
      tableContent += `${format(day.date, 'dd/MM/yyyy')} | ${String(day.transactions).padStart(6)} |`;
      if (paymentMethod === 'all' || paymentMethod === 'cash') {
        tableContent += ` ${day.cashAmount.toFixed(2)}€ |`;
      }
      if (paymentMethod === 'all' || paymentMethod === 'card') {
        tableContent += ` ${day.cardAmount.toFixed(2)}€ |`;
      }
      tableContent += ` ${day.totalAmount.toFixed(2)}€\n`;
    });
    
    // Total row
    tableContent += `${'='.repeat(50)}\n`;
    tableContent += `TOTAL         | ${String(totals.transactions).padStart(6)} |`;
    if (paymentMethod === 'all' || paymentMethod === 'cash') {
      tableContent += ` ${totals.cashAmount.toFixed(2)}€ |`;
    }
    if (paymentMethod === 'all' || paymentMethod === 'card') {
      tableContent += ` ${totals.cardAmount.toFixed(2)}€ |`;
    }
    tableContent += ` ${totals.totalAmount.toFixed(2)}€\n`;

    const rangeStart = format(dateRange.start, 'dd MMMM yyyy', { locale: fr });
    const rangeEnd = format(dateRange.end, 'dd MMMM yyyy', { locale: fr });
    const rangePeriod = `${rangeStart} au ${rangeEnd}`;

    switch (reportType) {
      case 'custom':
        subject = `Rapport personnalisé - ${rangePeriod}`;
        reportContent = `
📊 RAPPORT PERSONNALISÉ - ${rangeStart.toUpperCase()} AU ${rangeEnd.toUpperCase()}

💰 RÉSUMÉ
• Total CA : ${totals.totalAmount.toFixed(2)}€
• Total Transactions : ${totals.transactions}
${paymentMethod === 'all' ? `• Cash : ${totals.cashAmount.toFixed(2)}€\n• Bancontact : ${totals.cardAmount.toFixed(2)}€` : ''}

${tableContent}

${message ? `\n📝 NOTES :\n${message}` : ''}

---
Rapport généré automatiquement par L'app du salon
${format(new Date(), 'dd/MM/yyyy à HH:mm')}
        `;
        break;
        
      case 'daily':
        subject = `Rapport journalier - ${formattedDate}`;
        reportContent = `
📊 RAPPORT JOURNALIER - ${formattedDate.toUpperCase()}

💰 RÉSUMÉ
• Total CA : ${totals.totalAmount.toFixed(2)}€
• Total Transactions : ${totals.transactions}
${paymentMethod === 'all' ? `• Cash : ${totals.cashAmount.toFixed(2)}€\n• Bancontact : ${totals.cardAmount.toFixed(2)}€` : ''}

${tableContent}

${message ? `\n📝 NOTES :\n${message}` : ''}

---
Rapport généré automatiquement par L'app du salon
${format(new Date(), 'dd/MM/yyyy à HH:mm')}
        `;
        break;
        
      case 'weekly':
        subject = `Rapport hebdomadaire - ${rangePeriod}`;
        reportContent = `
📊 RAPPORT HEBDOMADAIRE - ${rangeStart.toUpperCase()} AU ${rangeEnd.toUpperCase()}

💰 RÉSUMÉ
• Total CA : ${totals.totalAmount.toFixed(2)}€
• Moyenne journalière : ${(totals.totalAmount / dailyData.length).toFixed(2)}€
• Total Transactions : ${totals.transactions}
${paymentMethod === 'all' ? `• Cash : ${totals.cashAmount.toFixed(2)}€\n• Bancontact : ${totals.cardAmount.toFixed(2)}€` : ''}

${tableContent}

${message ? `\n📝 NOTES :\n${message}` : ''}

---
Rapport généré automatiquement par L'app du salon
${format(new Date(), 'dd/MM/yyyy à HH:mm')}
        `;
        break;
        
      case 'monthly':
        subject = `Rapport mensuel - ${format(currentDate, 'MMMM yyyy', { locale: fr })}`;
        reportContent = `
📊 RAPPORT MENSUEL - ${format(currentDate, 'MMMM yyyy', { locale: fr }).toUpperCase()}

💰 RÉSUMÉ
• Total CA : ${totals.totalAmount.toFixed(2)}€
• Moyenne journalière : ${(totals.totalAmount / dailyData.length).toFixed(2)}€
• Total Transactions : ${totals.transactions}
${paymentMethod === 'all' ? `• Cash : ${totals.cashAmount.toFixed(2)}€\n• Bancontact : ${totals.cardAmount.toFixed(2)}€` : ''}

${tableContent}

${message ? `\n📝 NOTES :\n${message}` : ''}

---
Rapport généré automatiquement par L'app du salon
${format(new Date(), 'dd/MM/yyyy à HH:mm')}
        `;
        break;
    }

    return { subject, content: reportContent };
  };

  const handleSendReport = async () => {
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

    setIsLoading(true);

    try {
      const { subject, content } = generateReport();
      
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
  };

  const { content: previewContent } = generateReport();

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
              <Label htmlFor="selectedDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date du rapport journalier
              </Label>
              <Input
                id="selectedDate"
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
                  <Label htmlFor="startDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date de début
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date de fin
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                  />
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Moyen de paiement</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="cursor-pointer">Tous</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="cursor-pointer">Espèces</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="cursor-pointer">Bancontact</Label>
                  </div>
                </RadioGroup>
              </div>
            </>
          )}

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
            disabled={isLoading || !email}
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