import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import ServiceManagement from './ServiceManagement';

const Settings = () => {
  const { salonSettings, loading, saveSalonSettings } = useSupabaseSettings();
  const [salonName, setSalonName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [statsPassword, setStatsPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (salonSettings) {
      setSalonName(salonSettings.name || 'SalonPOS');
      setLogoUrl(salonSettings.logo_url || '');
      // Note: stats_password will be added to the hook later
    }
  }, [salonSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSalonSettings({
        name: salonName,
        logo_url: logoUrl
      });
      
      toast({
        title: "✅ Paramètres sauvegardés",
        description: "Vos modifications ont été enregistrées avec succès",
      });
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Paramètres généraux */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent/10 rounded-lg">
            <SettingsIcon className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-primary">Paramètres du salon</h3>
            <p className="text-sm text-muted-foreground">Configurez les informations de votre établissement</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="salonName">Nom du salon</Label>
            <Input
              id="salonName"
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              placeholder="Nom de votre salon"
              disabled={loading || isSaving}
            />
          </div>

          <div>
            <Label htmlFor="logoUrl">URL du logo (optionnel)</Label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              disabled={loading || isSaving}
            />
          </div>

          <Button 
            onClick={handleSave}
            disabled={loading || isSaving}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </Card>

      {/* Sécurité */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-destructive/10 rounded-lg">
            <Shield className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-primary">Sécurité</h3>
            <p className="text-sm text-muted-foreground">Protection de l'accès aux données sensibles</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="statsPassword">Mot de passe pour les statistiques</Label>
            <div className="relative">
              <Input
                id="statsPassword"
                type={showPassword ? "text" : "password"}
                value={statsPassword}
                onChange={(e) => setStatsPassword(e.target.value)}
                placeholder="Définir un mot de passe (optionnel)"
                disabled={loading || isSaving}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              🔒 Si défini, ce mot de passe sera demandé pour accéder aux statistiques et empêchera vos employés de voir le chiffre d'affaires
            </p>
          </div>

          <Button 
            onClick={handleSave}
            disabled={loading || isSaving}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder la sécurité'}
          </Button>
        </div>
      </Card>

      {/* Gestion des services */}
      <ServiceManagement />
    </div>
  );
};

export default Settings;