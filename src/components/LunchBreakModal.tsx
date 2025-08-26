import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Coffee, Clock, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LunchBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  barberId: string;
  barberName: string;
  onSave: (breakData: LunchBreakData) => void;
  onDelete: (barberId: string) => void;
  existingBreak?: LunchBreakData | null;
}

export interface LunchBreakData {
  barberId: string;
  startTime: string;
  endTime: string;
  duration: number; // en minutes
  isActive: boolean;
}

const LunchBreakModal = ({ isOpen, onClose, barberId, barberName, onSave, onDelete, existingBreak }: LunchBreakModalProps) => {
  const [breakData, setBreakData] = useState<LunchBreakData>({
    barberId,
    startTime: '12:00',
    endTime: '13:00',
    duration: 60,
    isActive: true
  });

  // Charger les données existantes quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      if (existingBreak) {
        setBreakData(existingBreak);
      } else {
        setBreakData({
          barberId,
          startTime: '12:00',
          endTime: '13:00',
          duration: 60,
          isActive: true
        });
      }
    }
  }, [isOpen, existingBreak, barberId]);

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  };

  const handleDurationChange = (duration: number) => {
    const newEndTime = calculateEndTime(breakData.startTime, duration);
    setBreakData({
      ...breakData,
      duration,
      endTime: newEndTime
    });
  };

  const handleStartTimeChange = (startTime: string) => {
    const newEndTime = calculateEndTime(startTime, breakData.duration);
    setBreakData({
      ...breakData,
      startTime,
      endTime: newEndTime
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave(breakData);
    onClose();
    
    toast({
      title: "Temps de midi configuré",
      description: `Pause automatique de ${breakData.startTime} à ${breakData.endTime} pour ${barberName}`,
    });
  };

  const handleDelete = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le temps de midi automatique pour ${barberName} ?`)) {
      onDelete(barberId);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coffee className="h-5 w-5" />
            Temps de midi automatique - {barberName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Indicateur si pause existe déjà */}
          {existingBreak && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Pause existante détectée</span>
              </div>
              <p className="text-xs text-blue-600">
                Actuellement configurée de {existingBreak.startTime} à {existingBreak.endTime}
                {existingBreak.isActive ? ' (Active)' : ' (Inactive)'}
              </p>
            </div>
          )}

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Configuration automatique</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Cette pause sera automatiquement bloquée dans l'agenda pour tous les jours de l'année.
            </p>
          </div>

          <div>
            <Label htmlFor="startTime">Heure de début</Label>
            <Input 
              id="startTime"
              type="time"
              value={breakData.startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
            />
          </div>

          <div>
            <Label>Durée de la pause</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button
                type="button"
                variant={breakData.duration === 30 ? "default" : "outline"}
                size="sm"
                onClick={() => handleDurationChange(30)}
              >
                30 min
              </Button>
              <Button
                type="button"
                variant={breakData.duration === 60 ? "default" : "outline"}
                size="sm"
                onClick={() => handleDurationChange(60)}
              >
                1 heure
              </Button>
              <Button
                type="button"
                variant={breakData.duration === 90 ? "default" : "outline"}
                size="sm"
                onClick={() => handleDurationChange(90)}
              >
                1h30
              </Button>
            </div>
          </div>

          <div>
            <Label>Heure de fin</Label>
            <div className="text-lg font-mono text-center p-3 bg-muted rounded">
              {breakData.endTime}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              id="isActive"
              checked={breakData.isActive}
              onChange={(e) => setBreakData({...breakData, isActive: e.target.checked})}
              className="rounded"
            />
            <Label htmlFor="isActive" className="text-sm">
              Activer le blocage automatique
            </Label>
          </div>

          <div className="flex gap-2 pt-4">
            {existingBreak && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDelete}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              {existingBreak ? 'Modifier' : 'Sauvegarder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LunchBreakModal;