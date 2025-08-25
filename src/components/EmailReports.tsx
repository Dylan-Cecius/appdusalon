import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, FileText, Calendar, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface EmailReportsProps {
  statsData: {
    todayRevenue: number;
    todayClients: number;
    monthlyRevenue: number;
    monthlyClients: number;
  };
}

const EmailReports = ({ statsData }: EmailReportsProps) => {
  const [email, setEmail] = useState('');
  const [reportType, setReportType] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generateReportContent = (type: string) => {
    const today = new Date().toLocaleDateString('fr-FR');
    
    switch (type) {
      case 'daily':
        return `Rapport journalier du ${today}

📊 STATISTIQUES DU JOUR
• Chiffre d'affaires: ${statsData.todayRevenue.toFixed(2)}€
• Nombre de clients: ${statsData.todayClients}
• Ticket moyen: ${(statsData.todayRevenue / (statsData.todayClients || 1)).toFixed(2)}€

${customMessage ? '\n📝 NOTES:\n' + customMessage : ''}

Rapport généré automatiquement par SalonPOS`;

      case 'weekly':
        return `Rapport hebdomadaire - Semaine du ${today}

📊 STATISTIQUES DE LA SEMAINE
• CA estimé: ${(statsData.todayRevenue * 6).toFixed(2)}€
• Clients estimés: ${statsData.todayClients * 6}

${customMessage ? '\n📝 NOTES:\n' + customMessage : ''}

Rapport généré automatiquement par SalonPOS`;

      case 'monthly':
        return `Rapport mensuel - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}

📊 STATISTIQUES DU MOIS
• Chiffre d'affaires: ${statsData.monthlyRevenue.toFixed(2)}€
• Nombre de clients: ${statsData.monthlyClients}
• Ticket moyen: ${(statsData.monthlyRevenue / (statsData.monthlyClients || 1)).toFixed(2)}€
• Evolution vs jour: +${((statsData.monthlyRevenue / 30 / statsData.todayRevenue - 1) * 100).toFixed(1)}%

${customMessage ? '\n📝 NOTES:\n' + customMessage : ''}

Rapport généré automatiquement par SalonPOS`;

      default:
        return '';
    }
  };

  const handleSendReport = async () => {
    if (!email || !reportType) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir l'email et sélectionner un type de rapport",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Simulation d'envoi d'email
      // En production, ceci ferait appel à votre API d'envoi d'emails
      const reportContent = generateReportContent(reportType);
      
      // Pour la démonstration, on copie le contenu dans le presse-papiers
      await navigator.clipboard.writeText(reportContent);
      
      setTimeout(() => {
        toast({
          title: "Rapport envoyé",
          description: `Le rapport ${reportType} a été envoyé à ${email}`,
        });
        
        // Reset form
        setEmail('');
        setReportType('');
        setCustomMessage('');
        setIsLoading(false);
      }, 2000);
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le rapport. Le contenu a été copié dans le presse-papiers.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const reportTypes = [
    { value: 'daily', label: 'Rapport journalier', icon: Calendar },
    { value: 'weekly', label: 'Rapport hebdomadaire', icon: TrendingUp },
    { value: 'monthly', label: 'Rapport mensuel', icon: FileText }
  ];

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
            <p className="text-sm text-muted-foreground">Envoyez vos statistiques par email</p>
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
            <Label>Type de rapport *</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un rapport" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Message personnalisé (optionnel)</Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Ajoutez des notes ou commentaires..."
              rows={3}
            />
          </div>

          <Button 
            onClick={handleSendReport}
            disabled={isLoading || !email || !reportType}
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Send className="h-4 w-4 mr-2" />
            {isLoading ? 'Envoi en cours...' : 'Envoyer le rapport'}
          </Button>
        </div>
      </Card>

      {/* Preview */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4 text-primary">Aperçu du rapport</h4>
        
        {reportType ? (
          <div className="bg-muted/20 p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {generateReportContent(reportType)}
            </pre>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Sélectionnez un type de rapport pour voir l'aperçu</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EmailReports;