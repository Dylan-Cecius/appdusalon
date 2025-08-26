import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Phone, Scissors, Euro, Clock, Trash2, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Appointment } from '@/data/appointments';

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onUpdate: (id: string, updates: Partial<Appointment>) => void;
  onDelete: (id: string) => void;
  onPay: (id: string, method: 'cash' | 'card') => void;
}

const EditAppointmentModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  onUpdate, 
  onDelete, 
  onPay 
}: EditAppointmentModalProps) => {
  const [editedAppointment, setEditedAppointment] = useState<Partial<Appointment>>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    if (appointment) {
      setEditedAppointment({
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        notes: appointment.notes || '',
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      });
    }
  }, [appointment]);

  if (!appointment) return null;

  const handleSave = () => {
    if (!editedAppointment.clientName?.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du client est requis",
        variant: "destructive"
      });
      return;
    }

    onUpdate(appointment.id, editedAppointment);
    onClose();
    
    toast({
      title: "Succès",
      description: "Rendez-vous mis à jour avec succès"
    });
  };

  const handleDelete = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
      onDelete(appointment.id);
      onClose();
      
      toast({
        title: "Succès",
        description: "Rendez-vous supprimé avec succès"
      });
    }
  };

  const handlePay = (method: 'cash' | 'card') => {
    onPay(appointment.id, method);
    onClose();
  };

  const getServiceColor = (services: any[]) => {
    if (!services || services.length === 0) return 'bg-purple-500';
    const category = services[0]?.category;
    switch (category) {
      case 'coupe': return 'bg-red-500';
      case 'barbe': return 'bg-pink-500';
      case 'combo': return 'bg-purple-600';
      case 'produit': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const ModalContent = ({ className }: { className?: string }) => (
    <div className={`space-y-4 ${className}`}>
      {/* Informations générales */}
      <div className="p-3 sm:p-4 bg-muted rounded-lg">
        <div className={`flex items-center justify-between mb-2 ${isMobile ? 'flex-col gap-2' : ''}`}>
          <div className="text-sm font-medium">
            📅 {format(appointment.startTime, isMobile ? 'dd/MM/yy' : 'EEEE d MMMM yyyy', { locale: fr })}
          </div>
          <Badge variant={appointment.isPaid ? "secondary" : "default"}>
            {appointment.isPaid ? '✓ Payé' : 'En attente'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {format(appointment.startTime, 'HH:mm')} - {format(appointment.endTime, 'HH:mm')}
        </div>
      </div>

      {/* Services */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Services</Label>
        <div className="space-y-2">
          {appointment.services.map((service) => (
            <div 
              key={service.id}
              className={`p-3 rounded text-white ${getServiceColor(appointment.services)}`}
            >
              <div className={`flex items-center justify-between ${isMobile ? 'flex-col gap-1 items-start' : ''}`}>
                <span className="font-medium">{service.name}</span>
                <span className="text-sm">{service.price.toFixed(2)}€</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-2 p-2 bg-green-100 rounded text-center">
          <span className="font-bold text-green-800">
            Total: {appointment.totalPrice.toFixed(2)}€
          </span>
        </div>
      </div>

      <Separator />

      {/* Modifier l'horaire */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">Modifier l'horaire</Label>
        
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <div>
            <Label htmlFor="startTime">Heure de début</Label>
            <Input 
              id="startTime"
              type="time"
              value={editedAppointment.startTime ? format(editedAppointment.startTime, 'HH:mm') : ''}
              onChange={(e) => {
                if (e.target.value && editedAppointment.startTime) {
                  const [hours, minutes] = e.target.value.split(':');
                  const newStartTime = new Date(editedAppointment.startTime);
                  newStartTime.setHours(parseInt(hours), parseInt(minutes));
                  
                  // Calculer automatiquement l'heure de fin basée sur la durée des services
                  const totalDuration = appointment.services.reduce((total, service) => 
                    total + service.duration + (service.appointmentBuffer || 0), 0
                  );
                  const newEndTime = new Date(newStartTime);
                  newEndTime.setMinutes(newEndTime.getMinutes() + totalDuration);
                  
                  setEditedAppointment({
                    ...editedAppointment,
                    startTime: newStartTime,
                    endTime: newEndTime
                  });
                }
              }}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="endTime">Heure de fin</Label>
            <Input 
              id="endTime"
              type="time"
              value={editedAppointment.endTime ? format(editedAppointment.endTime, 'HH:mm') : ''}
              onChange={(e) => {
                if (e.target.value && editedAppointment.endTime) {
                  const [hours, minutes] = e.target.value.split(':');
                  const newEndTime = new Date(editedAppointment.endTime);
                  newEndTime.setHours(parseInt(hours), parseInt(minutes));
                  
                  setEditedAppointment({
                    ...editedAppointment,
                    endTime: newEndTime
                  });
                }
              }}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Informations client modifiables */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="clientName">Nom du client</Label>
          <Input 
            id="clientName"
            value={editedAppointment.clientName || ''}
            onChange={(e) => setEditedAppointment({
              ...editedAppointment, 
              clientName: e.target.value
            })}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="clientPhone">Téléphone</Label>
          <Input 
            id="clientPhone"
            value={editedAppointment.clientPhone || ''}
            onChange={(e) => setEditedAppointment({
              ...editedAppointment, 
              clientPhone: e.target.value
            })}
            placeholder="0123456789"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea 
            id="notes"
            value={editedAppointment.notes || ''}
            onChange={(e) => setEditedAppointment({
              ...editedAppointment, 
              notes: e.target.value
            })}
            placeholder="Notes additionnelles..."
            rows={isMobile ? 2 : 3}
            className="mt-1"
          />
        </div>
      </div>

      <Separator />

      {/* Paiement */}
      {!appointment.isPaid && (
        <div>
          <Label className="text-sm font-medium mb-3 block">Encaisser le paiement</Label>
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Button 
              onClick={() => handlePay('cash')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Banknote className="h-4 w-4 mr-2" />
              Espèces
            </Button>
            <Button 
              onClick={() => handlePay('card')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Bancontact
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={`flex gap-2 pt-4 ${isMobile ? 'flex-col' : ''}`}>
        <Button 
          type="button" 
          variant="destructive" 
          onClick={handleDelete}
          className="flex-1"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Annuler
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Sauvegarder
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={onClose}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Éditer RDV
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              <ModalContent />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Éditer le rendez-vous
              </DialogTitle>
            </DialogHeader>
            <ModalContent />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default EditAppointmentModal;