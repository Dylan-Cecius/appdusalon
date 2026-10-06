import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings as SettingsIcon, Shield, Eye, EyeOff, Users, Plus, Edit, Trash2, Clock, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSupabaseSettings, type Barber } from '@/hooks/useSupabaseSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ServiceManagement from './ServiceManagement';
import OpeningHoursSettings from './OpeningHoursSettings';
import ProductManagement from './ProductManagement';
import ActivityLogViewer from './ActivityLogViewer';
import TwoFactorSettings from './TwoFactorSettings';

const DemoResetSection = () => {
  const { user } = useAuth();
  const [resetting, setResetting] = useState(false);

  if (user?.email !== 'demo@appdusalon.com') return null;

  const handleReset = async () => {
    if (!window.confirm('Réinitialiser toutes les données de démonstration ?')) return;
    setResetting(true);
    try {
      const { error } = await supabase.rpc('reset_demo_data');
      if (error) throw error;
      toast({
        title: "✅ Données réinitialisées",
        description: "Les données de démonstration ont été restaurées avec succès",
      });
      // Reload to refresh all data
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de réinitialiser les données",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card className="p-6 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
          <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-purple-700 dark:text-purple-300">Mode démonstration</h3>
          <p className="text-sm text-purple-600/80 dark:text-purple-400/80">
            Ces données sont fictives et peuvent être réinitialisées à tout moment.
          </p>
        </div>
      </div>
      <Button
        onClick={handleReset}
        disabled={resetting}
        variant="outline"
        className="border-purple-400 text-purple-700 hover:bg-purple-100 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/30"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        {resetting ? 'Réinitialisation...' : 'Réinitialiser les données démo'}
      </Button>
    </Card>
  );
};

const Settings = () => {
  const { salonSettings, barbers, loading, saveSalonSettings, addBarber, updateBarber, deleteBarber } = useSupabaseSettings();
  const { permissions } = usePermissions();
  const [statsPassword, setStatsPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // États pour la gestion des coiffeurs
  const [showAddBarber, setShowAddBarber] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [newBarber, setNewBarber] = useState({
    name: '',
    start_time: '09:00',
    end_time: '18:00',
    color: 'bg-blue-600',
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as string[],
    is_active: true
  });

  useEffect(() => {
    // Never load existing password into the input field for security
    // Password field stays empty and users must enter a new password to change it
    setStatsPassword('');
  }, [salonSettings]);

  const validatePassword = (password: string): { isValid: boolean; message: string } => {
    if (!password || password.length < 4) {
      return { isValid: false, message: "Le mot de passe doit contenir au moins 4 caractères" };
    }
    return { isValid: true, message: "" };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSalonSettings({
        name: salonSettings?.name || "L'app du salon",
        logo_url: salonSettings?.logo_url || '',
      });

      if (statsPassword.trim()) {
        const validation = validatePassword(statsPassword);
        if (!validation.isValid) {
          toast({
            title: "Mot de passe invalide",
            description: validation.message,
            variant: "destructive",
          });
          return;
        }

        const { error } = await (supabase as any).rpc('set_stats_password', {
          password_text: statsPassword,
        });
        if (error) throw error;

        setStatsPassword('');
      }

      toast({
        title: "Paramètres sauvegardés",
        description: statsPassword.trim()
          ? "Le mot de passe de protection a été mis à jour."
          : "Les paramètres du salon ont été sauvegardés.",
      });
    } catch (error) {
      console.error('[Settings] save failed', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisablePassword = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir désactiver la protection par mot de passe ? Les statistiques seront accessibles sans mot de passe.')) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await (supabase as any).rpc('clear_stats_password');
      if (error) throw error;

      setStatsPassword('');
      toast({
        title: "Mot de passe désactivé",
        description: "L'accès aux statistiques n'est plus protégé par mot de passe",
      });
      window.location.reload();
    } catch (error) {
      console.error('[Settings] password disable failed', error);
      toast({
        title: "Erreur",
        description: "Impossible de désactiver le mot de passe",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBarber = async () => {
    if (!newBarber.name.trim()) {
      toast({
        title: "❌ Erreur",
        description: "Le nom du coiffeur est obligatoire",
        variant: "destructive",
      });
      return;
    }

    const addedBarber = await addBarber(newBarber);
    
    // Créer automatiquement les créneaux indisponibles pour les heures hors service
    if (addedBarber) {
      await createUnavailableSlots(addedBarber.id, newBarber.start_time, newBarber.end_time, newBarber.working_days);
    }
    
    setNewBarber({
      name: '',
      start_time: '09:00',
      end_time: '18:00',
      color: 'bg-blue-600',
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      is_active: true
    });
    setShowAddBarber(false);
  };

  const createUnavailableSlots = async (barberId: string, startTime: string, endTime: string, workingDays: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Créer des blocs pour les heures avant et après le service
      const salonStart = '08:00';
      const salonEnd = '20:00';
      
      const blocksToCreate = [];
      
      // Bloc avant l'heure de début (si nécessaire)
      if (startTime > salonStart) {
        blocksToCreate.push({
          barber_id: barberId,
          start_time: salonStart,
          end_time: startTime,
          title: 'Indisponible',
          block_type: 'unavailable',
          notes: 'Créé automatiquement - hors horaires de service',
          user_id: user.id
        });
      }
      
      // Bloc après l'heure de fin (si nécessaire)
      if (endTime < salonEnd) {
        blocksToCreate.push({
          barber_id: barberId,
          start_time: endTime,
          end_time: salonEnd,
          title: 'Indisponible',
          block_type: 'unavailable',
          notes: 'Créé automatiquement - hors horaires de service',
          user_id: user.id
        });
      }

      // Créer des blocs pour les jours non travaillés
      const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const nonWorkingDays = allDays.filter(day => !workingDays.includes(day));
      
      if (nonWorkingDays.length > 0) {
        blocksToCreate.push({
          barber_id: barberId,
          start_time: salonStart,
          end_time: salonEnd,
          title: 'Jour de repos',
          block_type: 'unavailable',
          notes: `Créé automatiquement - jours non travaillés: ${nonWorkingDays.map(day => {
            const labels: { [key: string]: string } = {
              'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mer',
              'Thursday': 'Jeu', 'Friday': 'Ven', 'Saturday': 'Sam', 'Sunday': 'Dim'
            };
            return labels[day];
          }).join(', ')}`,
          user_id: user.id
        });
      }

      if (blocksToCreate.length > 0) {
        // Insérer tous les blocs pour une semaine type (on peut étendre plus tard)
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          
          for (const block of blocksToCreate) {
            // Pour les jours de repos, ne créer que pour les jours non travaillés
            if (block.title === 'Jour de repos') {
              const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
              if (!workingDays.includes(dayName)) {
                await supabase
                  .from('custom_blocks')
                  .insert({
                    ...block,
                    block_date: date.toISOString().split('T')[0]
                  });
              }
            } else {
              // Pour les créneaux avant/après, créer tous les jours travaillés
              const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
              if (workingDays.includes(dayName)) {
                await supabase
                  .from('custom_blocks')
                  .insert({
                    ...block,
                    block_date: date.toISOString().split('T')[0]
                  });
              }
            }
          }
        }
        
        toast({
          title: "✅ Créneaux configurés",
          description: "Les créneaux indisponibles ont été créés automatiquement",
        });
      }
    } catch (error) {
      console.error('Error creating unavailable slots:', error);
      toast({
        title: "⚠️ Attention",
        description: "Coiffeur ajouté, mais impossible de créer les créneaux automatiques",
        variant: "destructive"
      });
    }
  };

  const handleUpdateBarber = async (barber: Barber) => {
    await updateBarber(barber.id, barber);
    setEditingBarber(null);
  };

  const handleDeleteBarber = async (barberId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce coiffeur ?')) {
      await deleteBarber(barberId);
    }
  };

  const toggleWorkingDay = (day: string, isEditing = false) => {
    if (isEditing && editingBarber) {
      const workingDays = editingBarber.working_days || [];
      const newWorkingDays = workingDays.includes(day)
        ? workingDays.filter(d => d !== day)
        : [...workingDays, day];
      setEditingBarber({ ...editingBarber, working_days: newWorkingDays });
    } else {
      const workingDays = newBarber.working_days;
      const newWorkingDays = workingDays.includes(day)
        ? workingDays.filter(d => d !== day)
        : [...workingDays, day];
      setNewBarber({ ...newBarber, working_days: newWorkingDays });
    }
  };

  const colors = [
    'bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-red-600', 
    'bg-yellow-600', 'bg-pink-600', 'bg-indigo-600', 'bg-orange-600'
  ];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const daysLabels: { [key: string]: string } = {
    'Monday': 'Lun',
    'Tuesday': 'Mar', 
    'Wednesday': 'Mer',
    'Thursday': 'Jeu',
    'Friday': 'Ven',
    'Saturday': 'Sam',
    'Sunday': 'Dim'
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
                placeholder={salonSettings?.has_stats_password ? "Nouveau mot de passe (laisser vide pour conserver)" : "Définir un mot de passe sécurisé"}
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
              🔐 Minimum 4 caractères requis.
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border-l-4 border-amber-500">
            <div className="space-y-2">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>🛡️ Sécurité renforcée activée</strong>
              </p>
              {salonSettings?.has_stats_password ? (
                <div className="space-y-1">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ✅ Mot de passe configuré et vérifié côté serveur
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ✅ Le hash n’est jamais transmis au navigateur
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ✅ Les anciens formats sont migrés automatiquement après validation
                  </p>
                </div>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Aucun mot de passe configuré - Définissez-en un pour sécuriser l'accès
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleSave}
              disabled={loading || isSaving}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder la sécurité'}
            </Button>
            
            {salonSettings?.has_stats_password && (
              <Button 
                onClick={handleDisablePassword}
                disabled={loading || isSaving}
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                {isSaving ? 'Suppression...' : 'Désactiver le mot de passe'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Équipe — source unique V2 */}
      <Card className="v2-panel p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold sm:text-xl">Équipe</h3>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Les membres, horaires, rôles et commissions sont désormais gérés depuis un seul écran.
              </p>
            </div>
          </div>
          <Button asChild className="w-full rounded-xl sm:w-auto">
            <Link to="/equipe">Gérer l’équipe</Link>
          </Button>
        </div>
      </Card>

      {/* Heures d'ouverture */}
      <OpeningHoursSettings />

      {/* Gestion des services */}
      <ServiceManagement />
      
      {/* Gestion des produits */}
      <ProductManagement />
      
      

      {/* Double authentification (admin only) */}
      {permissions.isAdmin && <TwoFactorSettings />}

      {/* Journal d'activité (admin only) */}
      {permissions.isAdmin && <ActivityLogViewer />}

      {/* Mode démonstration */}
      <DemoResetSection />
    </div>
  );
};

export default Settings;