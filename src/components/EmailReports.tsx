import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [email, setEmail] = useState('');
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const generateReport = () => {
    const currentDate = new Date(selectedDate);
    const formattedDate = format(currentDate, 'dd MMMM yyyy', { locale: fr });
    
    let reportContent = '';
    let subject = '';

    switch (reportType) {
      case 'daily':
        subject = `Rapport journalier - ${formattedDate}`;
        reportContent = `
📊 RAPPORT JOURNALIER - ${formattedDate.toUpperCase()}

💰 CHIFFRE D'AFFAIRES
• Total du jour : ${statsData.todayRevenue.toFixed(2)}€

👥 CLIENTS
• Nombre de clients : ${statsData.todayClients}

💳 MÉTHODES DE PAIEMENT
• Espèces : ${statsData.paymentStats.today.cash} (${statsData.paymentStats.today.cashPercent.toFixed(1)}%)
• Bancontact : ${statsData.paymentStats.today.card} (${statsData.paymentStats.today.cardPercent.toFixed(1)}%)

${message ? `\n📝 NOTES :\n${message}` : ''}

---
Rapport généré automatiquement par SalonPOS
${format(new Date(), 'dd/MM/yyyy à HH:mm')}
        `;
        break;
        
      case 'weekly':
        subject = `Rapport hebdomadaire - Semaine du ${formattedDate}`;
        reportContent = `
📊 RAPPORT HEBDOMADAIRE - SEMAINE DU ${formattedDate.toUpperCase()}

💰 CHIFFRE D'AFFAIRES
• Total de la semaine : ${statsData.weeklyRevenue.toFixed(2)}€
• Moyenne journalière : ${(statsData.weeklyRevenue / 7).toFixed(2)}€

👥 CLIENTS
• Nombre de clients : ${statsData.weeklyClients}
• Moyenne par jour : ${(statsData.weeklyClients / 7).toFixed(1)}

💳 MÉTHODES DE PAIEMENT
• Espèces : ${statsData.paymentStats.weekly.cash} (${statsData.paymentStats.weekly.cashPercent.toFixed(1)}%)
• Bancontact : ${statsData.paymentStats.weekly.card} (${statsData.paymentStats.weekly.cardPercent.toFixed(1)}%)

${message ? `\n📝 NOTES :\n${message}` : ''}

---
Rapport généré automatiquement par SalonPOS
${format(new Date(), 'dd/MM/yyyy à HH:mm')}
        `;
        break;
        
      case 'monthly':
        subject = `Rapport mensuel - ${format(currentDate, 'MMMM yyyy', { locale: fr })}`;
        reportContent = `
📊 RAPPORT MENSUEL - ${format(currentDate, 'MMMM yyyy', { locale: fr }).toUpperCase()}

💰 CHIFFRE D'AFFAIRES
• Total du mois : ${statsData.monthlyRevenue.toFixed(2)}€
• Moyenne journalière : ${(statsData.monthlyRevenue / new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()).toFixed(2)}€

👥 CLIENTS
• Nombre de clients : ${statsData.monthlyClients}
• Moyenne par jour : ${(statsData.monthlyClients / new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()).toFixed(1)}

💳 MÉTHODES DE PAIEMENT
• Espèces : ${statsData.paymentStats.monthly.cash} (${statsData.paymentStats.monthly.cashPercent.toFixed(1)}%)
• Bancontact : ${statsData.paymentStats.monthly.card} (${statsData.paymentStats.monthly.cardPercent.toFixed(1)}%)

${message ? `\n📝 NOTES :\n${message}` : ''}

---
Rapport généré automatiquement par SalonPOS
${format(new Date(), 'dd/MM/yyyy à HH:mm')}
        `;
        break;
    }

    return { subject, content: reportContent };
  };

  const addDebugLog = (message: string) => {
    const timestamp = format(new Date(), 'HH:mm:ss');
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleSendReport = async () => {
    setDebugLogs([]); // Clear previous logs
    addDebugLog('🔍 Démarrage de l\'envoi...');
    addDebugLog(`📧 Email: ${email}`);
    addDebugLog(`📊 Type de rapport: ${reportType}`);

    if (!email) {
      addDebugLog('❌ Aucun email fourni');
      toast({
        title: "Erreur",
        description: "Veuillez saisir une adresse email",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addDebugLog('❌ Format email invalide');
      toast({
        title: "Erreur",
        description: "Veuillez saisir une adresse email valide",
        variant: "destructive",
      });
      return;
    }

    addDebugLog('✅ Email valide, vérification authentification...');
    
    // Check authentication status
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    addDebugLog(`👤 Utilisateur: ${user ? user.email : 'Non connecté'}`);
    
    if (authError) {
      addDebugLog(`❌ Erreur auth: ${authError.message}`);
    }

    setIsLoading(true);

    try {
      const { subject, content } = generateReport();
      addDebugLog(`📝 Rapport généré - Sujet: ${subject.substring(0, 50)}...`);
      addDebugLog(`📄 Taille contenu: ${content.length} caractères`);
      
      addDebugLog('🚀 Appel fonction Supabase...');
      
      const { data, error } = await supabase.functions.invoke('send-report-email', {
        body: {
          to: email,
          subject: subject,
          content: content,
          reportType: reportType
        }
      });

      addDebugLog(`📨 Réponse reçue - Succès: ${data?.success}`);
      if (error) {
        addDebugLog(`📨 Erreur fonction: ${JSON.stringify(error)}`);
        addDebugLog(`❌ Erreur Supabase: ${error.message}`);
        throw new Error(error.message || 'Erreur lors de l\'envoi');
      }

      if (!data?.success) {
        addDebugLog(`❌ Échec fonction: ${data?.error || 'Raison inconnue'}`);
        throw new Error(data?.error || data?.details || 'Erreur lors de l\'envoi');
      }

      addDebugLog('✅ Email envoyé avec succès!');
      toast({
        title: "✅ Email envoyé !",
        description: `Le rapport ${reportType} a été envoyé avec succès à ${email}`,
      });

      // Reset form
      setEmail('');
      setMessage('');
      
    } catch (error: any) {
      addDebugLog(`❌ Erreur envoi: ${error.message}`);
      addDebugLog(`❌ Détails: ${JSON.stringify(error)}`);
      
      let errorMessage = "Impossible d'envoyer le rapport par email";
      if (error.message?.includes("domain")) {
        errorMessage = "Domaine email non validé. Veuillez configurer votre domaine sur Resend.";
      } else if (error.message?.includes("API key")) {
        errorMessage = "Configuration email incorrecte. Veuillez vérifier la clé API Resend.";
      } else if (error.message?.includes("rate limit")) {
        errorMessage = "Limite d'envoi atteinte. Veuillez réessayer dans quelques minutes.";
      } else if (error.message?.includes("JWT")) {
        errorMessage = "Problème d'authentification. Veuillez vous reconnecter.";
      }

      toast({
        title: "❌ Erreur d'envoi",
        description: `${errorMessage} (${error.message})`,
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
          
          {/* Test button to verify debug panel works */}
          <Button 
            onClick={() => {
              setDebugLogs([]);
              addDebugLog('🧪 Test du panneau diagnostic');
              addDebugLog('✅ Si vous voyez ceci, le panneau fonctionne !');
              addDebugLog('📧 Maintenant testez avec un vrai email');
            }}
            variant="outline"
            className="w-full mt-2"
          >
            🧪 Test Diagnostic
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
        
        {/* Debug Panel - Only show if there are logs */}
        {debugLogs.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-4 text-destructive flex items-center gap-2">
              🔍 Diagnostic
            </h4>
            <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-lg max-h-64 overflow-y-auto">
              <div className="space-y-1">
                {debugLogs.map((log, index) => (
                  <div key={index} className="text-sm font-mono text-destructive">
                    {log}
                  </div>
                ))}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDebugLogs([])}
              className="mt-2"
            >
              Effacer les logs
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmailReports;