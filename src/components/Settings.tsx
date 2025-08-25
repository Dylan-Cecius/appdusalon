import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, User, Mail, Clock, Save, Upload, Building, Image } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { defaultBarbers, Barber } from '@/data/barbers';

const Settings = () => {
  const [barbers, setBarbers] = useState<Barber[]>(defaultBarbers);
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberStart, setNewBarberStart] = useState('10:00');
  const [newBarberEnd, setNewBarberEnd] = useState('19:00');
  
  // Salon settings
  const [salonSettings, setSalonSettings] = useState({
    name: 'SalonPOS',
    logo: '', // URL du logo
  });
  
  // Email reports settings
  const [emailSettings, setEmailSettings] = useState({
    email: '',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'custom',
    customDays: 7,
    enabled: false
  });

  const addBarber = () => {
    if (!newBarberName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom de coiffeur",
        variant: "destructive"
      });
      return;
    }

    const newBarber: Barber = {
      id: Date.now().toString(),
      name: newBarberName.trim(),
      startTime: newBarberStart,
      endTime: newBarberEnd,
      isActive: true,
      color: `bg-${['blue', 'purple', 'green', 'red', 'yellow', 'pink'][Math.floor(Math.random() * 6)]}-600`
    };

    setBarbers([...barbers, newBarber]);
    setNewBarberName('');
    
    toast({
      title: "Succès",
      description: `Coiffeur ${newBarber.name} ajouté avec succès`
    });
  };

  const updateBarber = (id: string, updates: Partial<Barber>) => {
    setBarbers(barbers.map(barber => 
      barber.id === id ? { ...barber, ...updates } : barber
    ));
    
    toast({
      title: "Succès",
      description: "Coiffeur mis à jour avec succès"
    });
  };

  const deleteBarber = (id: string) => {
    const barber = barbers.find(b => b.id === id);
    setBarbers(barbers.filter(b => b.id !== id));
    
    toast({
      title: "Succès",
      description: `Coiffeur ${barber?.name} supprimé avec succès`
    });
  };

  const saveSalonSettings = () => {
    // TODO: Save to database
    toast({
      title: "Succès",
      description: "Paramètres du salon sauvegardés"
    });
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simulate file upload - in a real app, you'd upload to your storage
      const logoUrl = URL.createObjectURL(file);
      setSalonSettings({...salonSettings, logo: logoUrl});
      
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
              {salonSettings.logo ? (
                <div className="flex items-center gap-4">
                  <img 
                    src={salonSettings.logo} 
                    alt="Logo du salon" 
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setSalonSettings({...salonSettings, logo: ''})}
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
              value={salonSettings.name}
              onChange={(e) => setSalonSettings({...salonSettings, name: e.target.value})}
              placeholder="Nom de votre salon"
              className="max-w-md"
            />
          </div>

          <Button onClick={saveSalonSettings} className="w-full md:w-auto">
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
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  <Input 
                    value={barber.name}
                    onChange={(e) => updateBarber(barber.id, { name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Début</Label>
                  <Input 
                    type="time"
                    value={barber.startTime}
                    onChange={(e) => updateBarber(barber.id, { startTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground">Fin</Label>
                  <Input 
                    type="time"
                    value={barber.endTime}
                    onChange={(e) => updateBarber(barber.id, { endTime: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => deleteBarber(barber.id)}
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            
            <div className="flex items-end">
              <Button onClick={addBarber} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
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