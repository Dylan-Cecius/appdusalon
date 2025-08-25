import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  useEffect(() => {
    if (appointment) {
      setEditedAppointment({
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        notes: appointment.notes || '',
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Éditer le rendez-vous
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informations générales */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">
                📅 {format(appointment.startTime, 'EEEE d MMMM yyyy', { locale: fr })}
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
                  <div className="flex items-center justify-between">
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
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <Separator />

          {/* Paiement */}
          {!appointment.isPaid && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Encaisser le paiement</Label>
              <div className="grid grid-cols-2 gap-3">
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
          <div className="flex gap-2 pt-4">
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
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentModal;