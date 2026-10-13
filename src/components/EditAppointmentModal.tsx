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
import { User, Phone, Scissors, Euro, Clock, XCircle, UserX, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Appointment } from '@/data/appointments';
import AppointmentTimeline from './agenda/AppointmentTimeline';
import { getAppointmentSegments, shiftAppointmentSegments } from '@/lib/appointmentSegments';

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onUpdate: (id: string, updates: Partial<Appointment>) => Promise<void> | void;
  onCancel: (id: string) => void;
  onNoShow: (id: string) => void;
  onPay: (id: string, method: 'cash' | 'card') => void;
}

const EditAppointmentModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  onUpdate, 
  onCancel,
  onNoShow,
  onPay 
}: EditAppointmentModalProps) => {
  const [editedAppointment, setEditedAppointment] = useState<Partial<Appointment>>({});
  const [saving, setSaving] = useState(false);
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
  const hasSegments = getAppointmentSegments(appointment).length > 1;
  const timelineAppointment = { ...appointment, ...editedAppointment,
    segments: editedAppointment.startTime ? shiftAppointmentSegments(appointment, editedAppointment.startTime) : appointment.segments };

  const amountPaid = Math.max(0, Number(appointment.amountPaid || 0));
  const remainingAmount = Math.max(0, Number(appointment.totalPrice || 0) - amountPaid);
  const hasDeposit = amountPaid > 0 && remainingAmount > 0;
  const isFullyPrepaid =
    appointment.paymentStatus === 'paid' &&
    amountPaid + 0.001 >= Number(appointment.totalPrice || 0);
  const isPaymentPending =
    appointment.status === 'pending_payment' || appointment.paymentStatus === 'pending';

  const paymentBadgeLabel = isPaymentPending
    ? 'Paiement en attente'
    : appointment.status === 'completed' && appointment.isPaid
      ? '✓ Encaissé'
      : isFullyPrepaid
        ? 'Prépayé'
        : hasDeposit
          ? 'Acompte payé'
          : appointment.isPaid
            ? '✓ Payé'
            : 'À encaisser';

  const handleSave = async () => {
    if (!editedAppointment.clientName?.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du client est requis",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      await onUpdate(appointment.id, editedAppointment);
      onClose();
      toast({ title: 'Succès', description: 'Rendez-vous mis à jour avec succès' });
    } catch {
      toast({ title: 'Modification impossible', description: 'Vérifiez le créneau et réessayez.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Annuler ce rendez-vous ? Le créneau sera libéré et l’historique sera conservé.')) {
      onCancel(appointment.id);
      onClose();
    }
  };

  const handleNoShow = () => {
    if (confirm('Marquer ce client comme absent (no-show) ?')) {
      onNoShow(appointment.id);
      onClose();
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

  const canCloseAppointment =
    !['completed', 'cancelled', 'no_show'].includes(appointment.status);

  const modalContent = (
    <div className="space-y-4">
      {/* Informations générales */}
      <div className="p-3 sm:p-4 bg-muted rounded-lg">
        <div className={`flex items-center justify-between mb-2 ${isMobile ? 'flex-col gap-2' : ''}`}>
          <div className="text-sm font-medium">
            📅 {format(appointment.startTime, isMobile ? 'dd/MM/yy' : 'EEEE d MMMM yyyy', { locale: fr })}
          </div>
          <Badge variant={appointment.isPaid || amountPaid > 0 ? "secondary" : "default"}>
            {paymentBadgeLabel}
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
        
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total prestation</span>
            <span className="font-semibold">{appointment.totalPrice.toFixed(2)} €</span>
          </div>
          {amountPaid > 0 && (
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-emerald-700">Déjà payé en ligne</span>
              <span className="font-semibold text-emerald-700">− {amountPaid.toFixed(2)} €</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold">Reste à payer</span>
            <span className="text-lg font-bold text-slate-950">{remainingAmount.toFixed(2)} €</span>
          </div>
        </div>
      </div>

      <Separator />

      <AppointmentTimeline appointment={timelineAppointment} />

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
                  
                  // Preserve the saved duration, including processing and cleanup.
                  const totalDuration = (new Date(appointment.endTime).getTime() - new Date(appointment.startTime).getTime()) / 60_000;
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
              readOnly={hasSegments}
              aria-describedby={hasSegments ? 'segment-duration-hint' : undefined}
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
            {hasSegments && <p id="segment-duration-hint" className="mt-1 text-xs text-muted-foreground">La durée suit les étapes de la prestation.</p>}
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
      {isPaymentPending ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
          Le créneau est temporairement réservé en attente du paiement en ligne.
        </div>
      ) : isFullyPrepaid && appointment.status !== 'completed' ? (
        <div>
          <Label className="mb-2 block text-sm font-medium">Prestation déjà payée</Label>
          <p className="mb-3 text-sm text-muted-foreground">
            Aucun solde à encaisser. Clôturez simplement la prestation une fois terminée.
          </p>
          <Button onClick={() => handlePay('card')} className="w-full">
            <CreditCard className="mr-2 h-4 w-4" />
            Clôturer la prestation
          </Button>
        </div>
      ) : !appointment.isPaid && remainingAmount > 0 ? (
        <div>
          <Label className="mb-1 block text-sm font-medium">Encaisser le solde</Label>
          {hasDeposit && (
            <p className="mb-3 text-xs text-muted-foreground">
              Acompte reçu : {amountPaid.toFixed(2)} € · Solde : {remainingAmount.toFixed(2)} €
            </p>
          )}
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Button
              onClick={() => handlePay('cash')}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <Banknote className="mr-2 h-4 w-4" />
              Espèces · {remainingAmount.toFixed(2)} €
            </Button>
            <Button
              onClick={() => handlePay('card')}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Carte · {remainingAmount.toFixed(2)} €
            </Button>
          </div>
        </div>
      ) : null}

      {/* Actions */}
      <div className="space-y-2 pt-4">
        {canCloseAppointment && (
          <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Button
              type="button"
              variant="outline"
              onClick={handleNoShow}
              className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              <UserX className="mr-2 h-4 w-4" />
              No-show
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Annuler le RDV
            </Button>
          </div>
        )}
        <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Fermer
          </Button>
          {canCloseAppointment && (
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </Button>
          )}
        </div>
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
              {modalContent}
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
            {modalContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default EditAppointmentModal;
