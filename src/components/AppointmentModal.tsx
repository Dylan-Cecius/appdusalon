import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  barberId?: string;
  selectedTimeSlot?: string;
}

const appointmentTypes = [
  { value: 'client', label: 'Rendez-vous client', color: 'bg-blue-500' },
  { value: 'rdv-medecin', label: 'RDV Médecin', color: 'bg-red-500' },
  { value: 'rdv-comptable', label: 'RDV Comptable', color: 'bg-purple-500' },
  { value: 'pas-la', label: 'Pas là', color: 'bg-gray-500' },
  { value: 'formation', label: 'Formation', color: 'bg-green-500' },
  { value: 'conge', label: 'Congé', color: 'bg-yellow-500' },
  { value: 'autre', label: 'Autre', color: 'bg-orange-500' }
];

const AppointmentModal = ({ isOpen, onClose, selectedDate, barberId, selectedTimeSlot }: AppointmentModalProps) => {
  const [appointmentType, setAppointmentType] = useState('client');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const { addAppointment } = useSupabaseAppointments();
  const { services } = useSupabaseServices();
  const isMobile = useIsMobile();

  // Pre-fill time when selectedTimeSlot is provided
  useEffect(() => {
    if (selectedTimeSlot && isOpen) {
      setStartTime(selectedTimeSlot);
    } else if (!isOpen) {
      // Reset form when modal closes
      setAppointmentType('client');
      setStartTime('');
      setClientName('');
      setClientPhone('');
      setSelectedServices([]);
      setNotes('');
    }
  }, [selectedTimeSlot, isOpen]);

  const totalDuration = selectedServices.reduce((total, service) => 
    total + service.duration, 0
  );

  const totalPrice = selectedServices.reduce((total, service) => total + service.price, 0);

  const addService = (service: any) => {
    if (!selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(prev => [...prev, service]);
    }
  };

  const removeService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(s => s.id !== serviceId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation depends on appointment type
    if (appointmentType === 'client') {
      if (!clientName || !startTime || selectedServices.length === 0) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!startTime) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner une heure",
          variant: "destructive",
        });
        return;
      }
    }

    const [hours, minutes] = startTime.split(':').map(Number);
    const appointmentStart = new Date(selectedDate);
    appointmentStart.setHours(hours, minutes, 0, 0);
    
    const appointmentEnd = new Date(appointmentStart);
    // Only use service duration for client display, not buffer
    const displayDuration = selectedServices.reduce((total, service) => 
      total + service.duration, 0
    );
    appointmentEnd.setMinutes(appointmentEnd.getMinutes() + displayDuration);

    console.log('Creating appointment with barberId:', barberId, 'selectedDate:', selectedDate);
    
    if (!barberId) {
      toast({
        title: "Erreur",
        description: "Aucun coiffeur sélectionné",
        variant: "destructive",
      });
      return;
    }

    // For non-client appointments, use the appointment type as clientName
    const finalClientName = appointmentType === 'client' ? clientName : appointmentTypes.find(t => t.value === appointmentType)?.label || clientName;
    
    addAppointment({
      clientName: finalClientName,
      clientPhone: appointmentType === 'client' ? clientPhone : undefined,
      services: appointmentType === 'client' ? selectedServices : [],
      startTime: appointmentStart,
      endTime: appointmentEnd,
      status: 'scheduled',
      totalPrice: appointmentType === 'client' ? totalPrice : 0,
      notes: notes || undefined,
      isPaid: false,
      barberId: barberId
    });

    toast({
      title: "Rendez-vous créé",
      description: `RDV pour ${finalClientName} le ${format(appointmentStart, 'dd/MM à HH:mm')}`,
    });

    // Reset form
    setAppointmentType('client');
    setClientName('');
    setClientPhone('');
    setSelectedServices([]);
    setStartTime('');
    setNotes('');
    onClose();
  };

  const ModalContent = useCallback(({ className }: { className?: string }) => (
    <form onSubmit={handleSubmit} className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Appointment Type Selection */}
      <div>
        <Label htmlFor="appointmentType">Type de rendez-vous *</Label>
        <Select value={appointmentType} onValueChange={setAppointmentType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border z-50">
            {appointmentTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${type.color}`}></div>
                  {type.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client Info - Only show for client appointments */}
      {appointmentType === 'client' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="clientName">Nom du client *</Label>
          <Input
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Jean Dupont"
            required
            autoComplete="off"
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
            autoComplete="off"
          />
        </div>
      </div>
      )}

      {/* Custom title for non-client appointments */}
      {appointmentType !== 'client' && (
        <div>
          <Label htmlFor="customTitle">Description (optionnel)</Label>
          <Input
            id="customTitle"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Description personnalisée..."
            autoComplete="off"
          />
        </div>
      )}

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

      {/* Services Selection - Only show for client appointments */}
      {appointmentType === 'client' && (
        <div>
          <Label>Services disponibles</Label>
          <div className={`grid gap-3 mt-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'}`}>
            {services.filter(service => service.category !== 'produit').map((service) => (
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
      )}

      {/* Selected Services */}
      {appointmentType === 'client' && selectedServices.length > 0 && (
        <div>
          <Label>Services sélectionnés</Label>
          <div className="space-y-2 mt-2">
            {selectedServices.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
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
            
            <div className={`flex justify-between items-center p-2 bg-accent/10 rounded font-semibold ${isMobile ? 'text-sm' : ''}`}>
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
          rows={isMobile ? 2 : 3}
        />
      </div>

      {/* Actions */}
      <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'justify-end'}`}>
        <Button type="button" variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-4 w-4 mr-2" />
          Créer le rendez-vous
        </Button>
      </div>
    </form>
  ), [appointmentType, clientName, clientPhone, startTime, selectedServices, notes, totalDuration, totalPrice, services, isMobile, handleSubmit, onClose, addService, removeService]);

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle>
                Nouveau RDV - {format(selectedDate, 'dd/MM', { locale: fr })}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              <ModalContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-2xl lg:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Nouveau rendez-vous - {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
              </DialogTitle>
            </DialogHeader>
            <ModalContent />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AppointmentModal;