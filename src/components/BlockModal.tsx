import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime: string;
  barberId: string;
  onSave: (blockData: BlockData) => void;
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

const BlockModal = ({ isOpen, onClose, selectedDate, selectedTime, barberId, onSave }: BlockModalProps) => {
  const [blockData, setBlockData] = useState<BlockData>({
    type: 'appointment',
    title: '',
    startTime: selectedTime,
    endTime: selectedTime,
    notes: '',
    clientName: '',
    clientPhone: '',
    barberId
  });

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
            <Select value={blockData.type} onValueChange={(value: any) => 
              setBlockData({...blockData, type: value})
            }>
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

          <div>
            <Label htmlFor="title">
              {blockData.type === 'appointment' ? 'Nom du client' : 'Titre'}
            </Label>
            <Input 
              id="title"
              value={blockData.title}
              onChange={(e) => setBlockData({...blockData, title: e.target.value})}
              placeholder={
                blockData.type === 'appointment' ? 'Nom du client' : 
                selectedBlockType?.label || 'Titre du créneau'
              }
              required
            />
          </div>

          {blockData.type === 'appointment' && (
            <div>
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input 
                id="phone"
                value={blockData.clientPhone}
                onChange={(e) => setBlockData({...blockData, clientPhone: e.target.value})}
                placeholder="0123456789"
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
            <Button type="submit" className="flex-1">
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BlockModal;