import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Mail, Send, Calendar } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';

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
  const { transactions } = useSupabaseTransactions();
  const { appointments } = useSupabaseAppointments();
  
  const [email, setEmail] = useState('');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState<'all' | 'cash' | 'card'>('all');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Calculate custom stats based on date range and payment method
  const customStats = useMemo(() => {
    if (reportType !== 'custom') return null;

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

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
  }, [reportType, startDate, endDate, paymentMethod, transactions, appointments]);

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
        dateRange = {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
        break;
      case 'monthly':
        dateRange = {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
        break;
      case 'custom':
        dateRange = {
          start: startOfDay(new Date(startDate)),
          end: endOfDay(new Date(endDate))
        };
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

    switch (reportType) {
      case 'custom':
        const startFormatted = format(new Date(startDate), 'dd MMMM yyyy', { locale: fr });
        const endFormatted = format(new Date(endDate), 'dd MMMM yyyy', { locale: fr });
        
        subject = `Rapport personnalisé - ${startFormatted} au ${endFormatted}`;
        reportContent = `
📊 RAPPORT PERSONNALISÉ - ${startFormatted.toUpperCase()} AU ${endFormatted.toUpperCase()}

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
        subject = `Rapport hebdomadaire - Semaine du ${formattedDate}`;
        reportContent = `
📊 RAPPORT HEBDOMADAIRE - SEMAINE DU ${formattedDate.toUpperCase()}

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
        title: "✅ Email envoyé !",
        description: `Le rapport ${reportType} a été envoyé avec succès à ${email}`,
      });

      // Reset form
      setEmail('');
      setMessage('');
      
    } catch (error: any) {
      let errorMessage = "Impossible d'envoyer le rapport par email";
      
      // Gestion spécifique de l'erreur Resend 403
      if (error.message?.includes("You can only send testing emails to your own email address")) {
        errorMessage = "Mode test Resend : Vous ne pouvez envoyer des emails qu'à votre propre adresse (dylan.cecius@gmail.com). Pour envoyer à d'autres destinataires, veuillez vérifier un domaine sur resend.com/domains";
      } else if (error.message?.includes("domain")) {
        errorMessage = "Domaine email non validé. Veuillez configurer votre domaine sur Resend.";
      } else if (error.message?.includes("API key")) {
        errorMessage = "Configuration email incorrecte. Veuillez vérifier la clé API Resend.";
      } else if (error.message?.includes("rate limit")) {
        errorMessage = "Limite d'envoi atteinte. Veuillez réessayer dans quelques minutes.";
      }

      toast({
        title: "❌ Erreur d'envoi",
        description: errorMessage,
        variant: "destructive",
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
            <Label htmlFor="email">Adresse email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
            />
          </div>

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
              <p className="text-sm text-muted-foreground mt-1">
                Sélectionnez la date pour laquelle générer le rapport journalier
              </p>
            </div>
          )}

          {reportType === 'custom' && (
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