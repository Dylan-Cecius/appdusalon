import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { X, Plus } from 'lucide-react';
import { services, Service } from '@/data/services';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
}

const AppointmentModal = ({ isOpen, onClose, selectedDate }: AppointmentModalProps) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const { addAppointment } = useSupabaseAppointments();

  const totalDuration = selectedServices.reduce((total, service) => 
    total + service.duration, 0
  );

  const totalPrice = selectedServices.reduce((total, service) => total + service.price, 0);

  const addService = (service: Service) => {
    if (!selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(prev => [...prev, service]);
    }
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName || !startTime || selectedServices.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const [hours, minutes] = startTime.split(':').map(Number);
    const appointmentStart = new Date(selectedDate);
    appointmentStart.setHours(hours, minutes, 0, 0);
    
    const appointmentEnd = new Date(appointmentStart);
    // Use service duration + buffer for calculating end time, but don't display buffer to user
    const totalDurationWithBuffer = selectedServices.reduce((total, service) => 
      total + service.duration + (service.appointmentBuffer || 0), 0
    );
    appointmentEnd.setMinutes(appointmentEnd.getMinutes() + totalDurationWithBuffer);

    addAppointment({
      clientName,
      clientPhone,
      services: selectedServices,
      startTime: appointmentStart,
      endTime: appointmentEnd,
      status: 'scheduled',
      totalPrice,
      notes: notes || undefined,
      isPaid: false
    });

    toast({
      title: "Rendez-vous créé",
      description: `RDV pour ${clientName} le ${format(appointmentStart, 'dd/MM à HH:mm')}`,
    });

    // Reset form
    setClientName('');
    setClientPhone('');
    setSelectedServices([]);
    setStartTime('');
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nouveau rendez-vous - {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName">Nom du client *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Jean Dupont"
                required
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Téléphone</Label>
              <Input
                id="clientPhone"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="0123456789 (optionnel)"
              />
            </div>
          </div>

          {/* Time */}
          <div>
            <Label htmlFor="startTime">Heure de début *</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          {/* Services Selection */}
          <div>
            <Label>Services disponibles</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {services.map((service) => (
                <Card 
                  key={service.id}
                  className="p-3 cursor-pointer hover:bg-accent/10 transition-colors"
                  onClick={() => addService(service)}
                >
                  <div className="text-sm font-medium">{service.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {service.price.toFixed(2)}€ • {service.duration}min
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Selected Services */}
          {selectedServices.length > 0 && (
            <div>
              <Label>Services sélectionnés</Label>
              <div className="space-y-2 mt-2">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{service.name}</span>
                      <Badge variant="outline">
                        {service.duration}min
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {service.price.toFixed(2)}€
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeService(service.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex justify-between items-center p-2 bg-accent/10 rounded font-semibold">
                  <span>Total: {totalDuration} minutes</span>
                  <span>{totalPrice.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informations complémentaires..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Créer le rendez-vous
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentModal;