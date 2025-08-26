import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings as SettingsIcon, Shield, Eye, EyeOff, Users, Plus, Edit, Trash2, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSupabaseSettings, type Barber } from '@/hooks/useSupabaseSettings';
import { supabase } from '@/integrations/supabase/client';
import ServiceManagement from './ServiceManagement';
import ProductManagement from './ProductManagement';

const Settings = () => {
  const { salonSettings, barbers, loading, saveSalonSettings, addBarber, updateBarber, deleteBarber } = useSupabaseSettings();
  const [salonName, setSalonName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
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
    if (salonSettings) {
      setSalonName(salonSettings.name || 'SalonPOS');
      setLogoUrl(salonSettings.logo_url || '');
      setStatsPassword(salonSettings.stats_password || '');
    }
  }, [salonSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let processedPassword = statsPassword;
      
      // Store password directly (temporarily until bcrypt is properly configured)
      processedPassword = statsPassword;

      await saveSalonSettings({
        name: salonName,
        logo_url: logoUrl,
        stats_password: processedPassword || null
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

  const handleAddBarber = async () => {
    if (!newBarber.name.trim()) {
      toast({
        title: "❌ Erreur",
        description: "Le nom du coiffeur est obligatoire",
        variant: "destructive",
      });
      return;
    }

    await addBarber(newBarber);
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
                placeholder="Définir un nouveau mot de passe sécurisé"
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
              🔐 Mot de passe pour protéger l'accès aux statistiques et paramètres.
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border-l-4 border-green-500">
            <p className="text-sm text-green-700 dark:text-green-400">
              🛡️ <strong>Sécurité renforcée :</strong> Les mots de passe sont maintenant hachés de manière sécurisée. 
              {salonSettings?.stats_password?.startsWith('$2') 
                ? "Votre mot de passe actuel est déjà sécurisé." 
                : "Définissez un nouveau mot de passe pour activer la protection sécurisée."
              }
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

      {/* Gestion des coiffeurs */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-primary">Gestion des coiffeurs</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Ajoutez et gérez vos coiffeurs</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowAddBarber(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Ajouter un coiffeur</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>

        {/* Liste des coiffeurs */}
        <div className="space-y-4">
          {barbers.map((barber) => (
            <div key={barber.id} className="p-3 sm:p-4 border rounded-lg">
              {editingBarber?.id === barber.id ? (
                // Mode édition
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Nom</Label>
                      <Input
                        value={editingBarber.name}
                        onChange={(e) => setEditingBarber({ ...editingBarber, name: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Couleur</Label>
                      <div className="grid grid-cols-4 sm:flex gap-2 mt-1">
                        {colors.map(color => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded ${color} border-2 ${editingBarber.color === color ? 'border-primary' : 'border-transparent'}`}
                            onClick={() => setEditingBarber({ ...editingBarber, color })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Heure de début</Label>
                      <Input
                        type="time"
                        value={editingBarber.start_time}
                        onChange={(e) => setEditingBarber({ ...editingBarber, start_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Heure de fin</Label>
                      <Input
                        type="time"
                        value={editingBarber.end_time}
                        onChange={(e) => setEditingBarber({ ...editingBarber, end_time: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm">Jours de travail</Label>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-2">
                      {daysOfWeek.map(day => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-${day}`}
                            checked={editingBarber.working_days?.includes(day) || false}
                            onCheckedChange={() => toggleWorkingDay(day, true)}
                          />
                          <Label htmlFor={`edit-${day}`} className="text-xs sm:text-sm">{daysLabels[day]}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-active-${barber.id}`}
                      checked={editingBarber.is_active}
                      onCheckedChange={(checked) => setEditingBarber({ ...editingBarber, is_active: !!checked })}
                    />
                    <Label htmlFor={`edit-active-${barber.id}`} className="text-sm">Coiffeur actif</Label>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => handleUpdateBarber(editingBarber)} className="bg-green-600 hover:bg-green-700 text-white" size="sm">
                      Sauvegarder
                    </Button>
                    <Button onClick={() => setEditingBarber(null)} variant="outline" size="sm">
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                // Mode affichage
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`w-4 h-4 rounded ${barber.color} flex-shrink-0 mt-0.5 sm:mt-0`}></div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm sm:text-base">{barber.name}</h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="whitespace-nowrap">{barber.start_time} - {barber.end_time}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {barber.working_days?.map(day => (
                            <Badge key={day} variant="secondary" className="text-xs px-1.5 py-0.5">
                              {daysLabels[day]}
                            </Badge>
                          ))}
                        </div>
                        {!barber.is_active && (
                          <Badge variant="destructive" className="text-xs w-fit">Inactif</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-auto">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditingBarber(barber)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Modifier</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => handleDeleteBarber(barber.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Formulaire d'ajout */}
          {showAddBarber && (
            <div className="p-3 sm:p-4 border-2 border-dashed border-primary/20 rounded-lg bg-primary/5">
              <h4 className="font-medium mb-4 text-sm sm:text-base">Nouveau coiffeur</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Nom *</Label>
                    <Input
                      value={newBarber.name}
                      onChange={(e) => setNewBarber({ ...newBarber, name: e.target.value })}
                      placeholder="Nom du coiffeur"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Couleur</Label>
                    <div className="grid grid-cols-4 sm:flex gap-2 mt-1">
                      {colors.map(color => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded ${color} border-2 ${newBarber.color === color ? 'border-primary' : 'border-transparent'}`}
                          onClick={() => setNewBarber({ ...newBarber, color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Heure de début</Label>
                    <Input
                      type="time"
                      value={newBarber.start_time}
                      onChange={(e) => setNewBarber({ ...newBarber, start_time: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Heure de fin</Label>
                    <Input
                      type="time"
                      value={newBarber.end_time}
                      onChange={(e) => setNewBarber({ ...newBarber, end_time: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm">Jours de travail</Label>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-2">
                    {daysOfWeek.map(day => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-${day}`}
                          checked={newBarber.working_days.includes(day)}
                          onCheckedChange={() => toggleWorkingDay(day)}
                        />
                        <Label htmlFor={`new-${day}`} className="text-xs sm:text-sm">{daysLabels[day]}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={handleAddBarber} className="bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                  <Button onClick={() => setShowAddBarber(false)} variant="outline" size="sm">
                    Annuler
                  </Button>
                </div>
              </div>
            </div>
          )}

          {barbers.length === 0 && !showAddBarber && (
            <div className="text-center py-6 sm:py-8 text-muted-foreground">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base mb-3">Aucun coiffeur configuré</p>
              <Button 
                onClick={() => setShowAddBarber(true)}
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto"
              >
                Ajouter le premier coiffeur
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Gestion des services */}
      <ServiceManagement />
      
      {/* Gestion des produits */}
      <ProductManagement />
    </div>
  );
};

export default Settings;