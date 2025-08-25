import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { services, Service } from '@/data/services';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
  barberId: string;
  onSave: (blockData: BlockData) => void;
  onDelete?: () => void;
  existingData?: BlockData;
}

export interface BlockData {
  type: 'appointment' | 'break' | 'unavailable' | 'rdv-comptable' | 'rdv-medecin' | 'formation' | 'conge';
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
  clientName?: string;
  clientPhone?: string;
  barberId: string;
  selectedServices?: Service[];
  totalPrice?: number;
}

const blockTypes = [
  { value: 'appointment', label: 'Rendez-vous client', color: 'bg-blue-500' },
  { value: 'break', label: 'Pause déjeuner', color: 'bg-orange-500' },
  { value: 'unavailable', label: 'Non disponible', color: 'bg-gray-500' },
  { value: 'rdv-comptable', label: 'RDV Comptable', color: 'bg-purple-500' },
  { value: 'rdv-medecin', label: 'RDV Médecin', color: 'bg-red-500' },
  { value: 'formation', label: 'Formation', color: 'bg-green-500' },
  { value: 'conge', label: 'Congé', color: 'bg-yellow-500' }
];

const BlockModal = ({ isOpen, onClose, selectedDate, selectedTime, barberId, onSave, onDelete, existingData }: BlockModalProps) => {
  const [blockData, setBlockData] = useState<BlockData>(
    existingData || {
      type: 'appointment',
      title: '',
      startTime: selectedTime,
      endTime: selectedTime,
      notes: '',
      clientName: '',
      clientPhone: '',
      barberId,
      selectedServices: [],
      totalPrice: 0
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!blockData.title) {
      return;
    }

    onSave(blockData);
    onClose();
    
    // Reset form
    setBlockData({
      type: 'appointment',
      title: '',
      startTime: selectedTime,
      endTime: selectedTime,
      notes: '',
      clientName: '',
      clientPhone: '',
      barberId
    });
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const selectedBlockType = blockTypes.find(type => type.value === blockData.type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Ajouter un créneau
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Date</Label>
            <div className="text-sm text-muted-foreground">
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </div>
          </div>

          <div>
            <Label htmlFor="type">Type de créneau</Label>
            <Select value={blockData.type} onValueChange={(value: any) => {
              setBlockData({...blockData, type: value});
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {blockTypes.map((type) => (
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

          {blockData.type === 'appointment' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Nom du client</Label>
                <Input 
                  id="title"
                  value={blockData.title}
                  onChange={(e) => setBlockData({...blockData, title: e.target.value})}
                  placeholder="Nom du client"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Téléphone (optionnel)</Label>
                <Input 
                  id="phone"
                  value={blockData.clientPhone}
                  onChange={(e) => setBlockData({...blockData, clientPhone: e.target.value})}
                  placeholder="0123456789"
                />
              </div>

              <div>
                <Label htmlFor="service">Service</Label>
                <Select onValueChange={(serviceId) => {
                  const service = services.find(s => s.id === serviceId);
                  if (service) {
                    const totalDuration = service.duration + (service.appointmentBuffer || 0);
                    const newEndTime = calculateEndTime(blockData.startTime, totalDuration);
                    setBlockData({
                      ...blockData,
                      selectedServices: [service],
                      totalPrice: service.price,
                      endTime: newEndTime
                    });
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un service" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex justify-between items-center w-full">
                          <span>{service.name}</span>
                          <span className="text-muted-foreground text-sm ml-2">
                            {service.price.toFixed(2)}€ • {service.duration}min
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {blockData.selectedServices && blockData.selectedServices.length > 0 && (
                <div className="p-2 bg-accent/10 rounded">
                  <div className="flex justify-between items-center text-sm">
                    <span>Durée: {blockData.selectedServices.reduce((total, service) => 
                      total + service.duration + (service.appointmentBuffer || 0), 0
                    )} minutes</span>
                    <span className="font-medium">{(blockData.totalPrice || 0).toFixed(2)}€</span>
                  </div>
                </div>
              )}
            </div>
          ) : (

            <div>
              <Label htmlFor="title">Titre</Label>
              <Input 
                id="title"
                value={blockData.title}
                onChange={(e) => setBlockData({...blockData, title: e.target.value})}
                placeholder={selectedBlockType?.label || 'Titre du créneau'}
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Heure de début</Label>
              <Input 
                id="startTime"
                type="time"
                value={blockData.startTime}
                onChange={(e) => setBlockData({...blockData, startTime: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="endTime">Heure de fin</Label>
              <Input 
                id="endTime"
                type="time"
                value={blockData.endTime}
                onChange={(e) => setBlockData({...blockData, endTime: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea 
              id="notes"
              value={blockData.notes}
              onChange={(e) => setBlockData({...blockData, notes: e.target.value})}
              placeholder="Notes additionnelles..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            {onDelete && existingData && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="px-3"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="submit" className="flex-1">
              {existingData ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BlockModal;