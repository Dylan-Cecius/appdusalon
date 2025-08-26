import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, User, Mail, Clock, Save, Upload, Building, Image } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';

const Settings = () => {
  const { salonSettings, barbers, loading, saveSalonSettings, addBarber, updateBarber, deleteBarber } = useSupabaseSettings();
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberStart, setNewBarberStart] = useState('10:00');
  const [newBarberEnd, setNewBarberEnd] = useState('19:00');
  const [newBarberWorkingDays, setNewBarberWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [localSalonSettings, setLocalSalonSettings] = useState(salonSettings);
  
  // Sync local settings with props when salonSettings changes
  useEffect(() => {
    if (salonSettings) {
      setLocalSalonSettings(salonSettings);
    }
  }, [salonSettings]);
  
  // Email reports settings
  const [emailSettings, setEmailSettings] = useState({
    email: '',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'custom',
    customDays: 7,
    enabled: false
  });

  const handleAddBarber = () => {
    if (!newBarberName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom de coiffeur",
        variant: "destructive"
      });
      return;
    }

    const newBarber = {
      name: newBarberName.trim(),
      start_time: newBarberStart,
      end_time: newBarberEnd,
      is_active: true,
      color: `bg-${['blue', 'purple', 'green', 'red', 'yellow', 'pink'][Math.floor(Math.random() * 6)]}-600`,
      working_days: newBarberWorkingDays
    };

    addBarber(newBarber);
    setNewBarberName('');
    setNewBarberWorkingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  };

  const handleUpdateBarber = (id: string, updates: any) => {
    updateBarber(id, updates);
  };

  const handleDeleteBarber = (id: string) => {
    deleteBarber(id);
  };

  const handleSaveSalonSettings = () => {
    saveSalonSettings(localSalonSettings);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create temporary URL for immediate display
      const logoUrl = URL.createObjectURL(file);
      const newSettings = {...localSalonSettings, logo_url: logoUrl};
      setLocalSalonSettings(newSettings);
      
      // Save immediately to database
      await saveSalonSettings(newSettings);
      
      toast({
        title: "Logo téléchargé",
        description: "Votre logo a été mis à jour avec succès"
      });
    }
  };
  const saveEmailSettings = () => {
    if (emailSettings.enabled && !emailSettings.email) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une adresse email",
        variant: "destructive"
      });
      return;
    }

    // TODO: Save to database
    toast({
      title: "Succès",
      description: "Paramètres de rapport email sauvegardés"
    });
  };

  const getFrequencyText = () => {
    switch (emailSettings.frequency) {
      case 'daily': return 'tous les jours';
      case 'weekly': return 'toutes les semaines';
      case 'monthly': return 'tous les mois';
      case 'custom': return `tous les ${emailSettings.customDays} jours`;
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Paramètres du salon */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Paramètres du salon</h2>
        </div>

        <div className="space-y-6">
          {/* Logo du salon */}
          <div>
            <Label htmlFor="logo">Logo du salon</Label>
            <div className="mt-2 flex items-center gap-4">
              {localSalonSettings.logo_url ? (
                <div className="flex items-center gap-4">
                  <img 
                    src={localSalonSettings.logo_url} 
                    alt="Logo du salon" 
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setLocalSalonSettings({...localSalonSettings, logo_url: ''})}
                  >
                    Supprimer
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <Image className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <input
                      type="file"
                      id="logo"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('logo')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Télécharger un logo
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG jusqu'à 2MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nom du salon */}
          <div>
            <Label htmlFor="salonName">Nom du salon</Label>
            <Input 
              id="salonName"
              value={localSalonSettings.name}
              onChange={(e) => setLocalSalonSettings({...localSalonSettings, name: e.target.value})}
              placeholder="Nom de votre salon"
              className="max-w-md"
            />
          </div>

          <Button onClick={handleSaveSalonSettings} className="w-full md:w-auto">
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder les paramètres du salon
          </Button>
        </div>
      </Card>

      <Separator />

      {/* Gestion des coiffeurs */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Gestion des coiffeurs</h2>
        </div>

        {/* Liste des coiffeurs existants */}
        <div className="space-y-4 mb-6">
          {barbers.map((barber) => (
            <div key={barber.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className={`w-4 h-4 rounded ${barber.color}`}></div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  <Input 
                    value={barber.name}
                    onChange={(e) => handleUpdateBarber(barber.id, { name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Début</Label>
                  <Input 
                    type="time"
                    value={barber.start_time}
                    onChange={(e) => handleUpdateBarber(barber.id, { start_time: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Fin</Label>
                  <Input 
                    type="time"
                    value={barber.end_time}
                    onChange={(e) => handleUpdateBarber(barber.id, { end_time: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Jours de travail</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, index) => {
                      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      const isSelected = barber.working_days?.includes(dayNames[index]);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const currentDays = barber.working_days || [];
                            const newDays = isSelected 
                              ? currentDays.filter(d => d !== dayNames[index])
                              : [...currentDays, dayNames[index]];
                            handleUpdateBarber(barber.id, { working_days: newDays });
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            isSelected 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleDeleteBarber(barber.id)}
                disabled={barbers.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Separator className="my-6" />

        {/* Ajouter un nouveau coiffeur */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Ajouter un nouveau coiffeur</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="newName">Nom</Label>
                <Input 
                  id="newName"
                  value={newBarberName}
                  onChange={(e) => setNewBarberName(e.target.value)}
                  placeholder="Nom du coiffeur"
                />
              </div>
              
              <div>
                <Label htmlFor="newStart">Heure de début</Label>
                <Input 
                  id="newStart"
                  type="time"
                  value={newBarberStart}
                  onChange={(e) => setNewBarberStart(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="newEnd">Heure de fin</Label>
                <Input 
                  id="newEnd"
                  type="time"
                  value={newBarberEnd}
                  onChange={(e) => setNewBarberEnd(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Jours de travail</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { short: 'Lun', full: 'Monday' },
                  { short: 'Mar', full: 'Tuesday' },
                  { short: 'Mer', full: 'Wednesday' },
                  { short: 'Jeu', full: 'Thursday' },
                  { short: 'Ven', full: 'Friday' },
                  { short: 'Sam', full: 'Saturday' },
                  { short: 'Dim', full: 'Sunday' }
                ].map((day) => {
                  const isSelected = newBarberWorkingDays.includes(day.full);
                  return (
                    <button
                      key={day.full}
                      type="button"
                      onClick={() => {
                        setNewBarberWorkingDays(prev => 
                          isSelected 
                            ? prev.filter(d => d !== day.full)
                            : [...prev, day.full]
                        );
                      }}
                      className={`px-3 py-2 text-sm rounded ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sélectionnez les jours où ce coiffeur travaille
              </p>
            </div>

            <Button onClick={handleAddBarber} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </div>
      </Card>

      {/* Paramètres de rapport email */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Rapports automatiques par email</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input 
              type="checkbox"
              id="enableReports"
              checked={emailSettings.enabled}
              onChange={(e) => setEmailSettings({...emailSettings, enabled: e.target.checked})}
              className="rounded"
            />
            <Label htmlFor="enableReports">Activer l'envoi automatique de rapports</Label>
          </div>

          {emailSettings.enabled && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Adresse email</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={emailSettings.email}
                    onChange={(e) => setEmailSettings({...emailSettings, email: e.target.value})}
                    placeholder="votre@email.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="frequency">Fréquence d'envoi</Label>
                  <Select value={emailSettings.frequency} onValueChange={(value: any) => 
                    setEmailSettings({...emailSettings, frequency: value})
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidien</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {emailSettings.frequency === 'custom' && (
                <div>
                  <Label htmlFor="customDays">Nombre de jours</Label>
                  <Input 
                    id="customDays"
                    type="number"
                    min="1"
                    max="365"
                    value={emailSettings.customDays}
                    onChange={(e) => setEmailSettings({...emailSettings, customDays: parseInt(e.target.value) || 1})}
                  />
                </div>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Résumé</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Les rapports statistiques seront envoyés à <strong>{emailSettings.email}</strong> {getFrequencyText()}.
                </p>
              </div>

              <Button onClick={saveEmailSettings} className="w-full md:w-auto">
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder les paramètres
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Settings;