import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { X, Clock, Trash2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('client');

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

  const addService = (service: Service) => {
    if (!blockData.selectedServices?.find(s => s.id === service.id)) {
      const updatedServices = [...(blockData.selectedServices || []), service];
      const totalDuration = updatedServices.reduce((total, service) => 
        total + service.duration + (service.appointmentBuffer || 0), 0
      );
      const totalPrice = updatedServices.reduce((total, service) => total + service.price, 0);
      
      const newEndTime = calculateEndTime(blockData.startTime, totalDuration);
      
      setBlockData({
        ...blockData,
        selectedServices: updatedServices,
        totalPrice,
        endTime: newEndTime
      });
    }
  };

  const removeService = (serviceId: string) => {
    const updatedServices = (blockData.selectedServices || []).filter(s => s.id !== serviceId);
    const totalDuration = updatedServices.reduce((total, service) => 
      total + service.duration + (service.appointmentBuffer || 0), 0
    );
    const totalPrice = updatedServices.reduce((total, service) => total + service.price, 0);
    
    const newEndTime = totalDuration > 0 ? calculateEndTime(blockData.startTime, totalDuration) : blockData.startTime;
    
    setBlockData({
      ...blockData,
      selectedServices: updatedServices,
      totalPrice,
      endTime: newEndTime
    });
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
              if (value === 'appointment') {
                setActiveTab('client');
              }
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
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="client">Rendez-vous client</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
              </TabsList>
              
              <TabsContent value="client" className="space-y-4">
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
              </TabsContent>
              
              <TabsContent value="services" className="space-y-4">
                <div>
                  <Label>Services disponibles</Label>
                  <div className="grid grid-cols-1 gap-2 mt-2 max-h-40 overflow-y-auto">
                    {services.map((service) => (
                      <Card 
                        key={service.id}
                        className="p-2 cursor-pointer hover:bg-accent/10 transition-colors"
                        onClick={() => addService(service)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium">{service.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {service.price.toFixed(2)}€ • {service.duration}min
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {blockData.selectedServices && blockData.selectedServices.length > 0 && (
                  <div>
                    <Label>Services sélectionnés</Label>
                    <div className="space-y-2 mt-2">
                      {blockData.selectedServices.map((service) => (
                        <div key={service.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{service.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {service.duration}min
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {service.price.toFixed(2)}€
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeService(service.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      
                      {blockData.selectedServices.length > 0 && (
                        <div className="flex justify-between items-center p-2 bg-accent/10 rounded font-semibold text-sm">
                          <span>Total: {blockData.selectedServices.reduce((total, service) => 
                            total + service.duration + (service.appointmentBuffer || 0), 0
                          )} minutes</span>
                          <span>{(blockData.totalPrice || 0).toFixed(2)}€</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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

          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setBlockData({
                ...blockData, 
                endTime: calculateEndTime(blockData.startTime, 30)
              })}
            >
              +30min
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setBlockData({
                ...blockData, 
                endTime: calculateEndTime(blockData.startTime, 60)
              })}
            >
              +1h
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setBlockData({
                ...blockData, 
                endTime: calculateEndTime(blockData.startTime, 90)
              })}
            >
              +1h30
            </Button>
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