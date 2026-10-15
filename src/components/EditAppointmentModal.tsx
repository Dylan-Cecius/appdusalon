import { appointmentEditState, appointmentEditChanged, reconcileAppointmentEdit } from '@/lib/appointmentEditState';
import { AppointmentContactError, type AppointmentContactUpdates } from '@/lib/appointmentContactUpdate';
import { appointmentPalette } from '@/lib/appointmentPalette';
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppointmentStatusBadge from './agenda/AppointmentStatusBadge';
import { getAppointmentDetails } from '@/lib/appointmentDetails';
import { Separator } from '@/components/ui/separator';
import { User, Phone, Scissors, Euro, Clock, XCircle, UserX, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Appointment } from '@/data/appointments';
import { runExclusiveAction } from '@/lib/exclusiveAction';
import AppointmentTimeline from './agenda/AppointmentTimeline';

interface EditAppointmentModalProps {
  onClientHistory?: () => void;
  onReschedule: () => void;
  serviceColors?: Record<string, string | undefined>;
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onUpdate: (id: string, updates: AppointmentContactUpdates, original: Appointment) => Promise<void> | void;
  onCancel: (id: string) => Promise<unknown>;
  onNoShow: (id: string) => Promise<unknown>;
  onPay: (id: string, method: 'cash' | 'card') => Promise<unknown>;
}

const EditAppointmentModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  onUpdate, 
  onCancel,
  onNoShow,
  onPay, onClientHistory, onReschedule, serviceColors = {}
}: EditAppointmentModalProps) => {
  const [edit, setEdit] = useState(() => appointment ? appointmentEditState(appointment) : null);
  const [saving, setSaving] = useState(false);
  const pendingAction = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (actionError) errorRef.current?.focus(); }, [actionError]);
  useEffect(() => {
    if (appointment) setEdit(current => reconcileAppointmentEdit(current, appointment, pendingAction.current));
  }, [appointment]);

  if (!appointment || !edit) return null;
  const editedAppointment = edit.draft;
  const clientDraftChanged = appointmentEditChanged(edit);
  const changedRemotely = clientDraftChanged && edit.base.updatedAt !== appointment.updatedAt;
  const setEditedAppointment = (draft: AppointmentContactUpdates) => setEdit(current => current ? { ...current, draft } : current);
  const {
    amountPaid, remainingAmount, hasDeposit, canEdit: canCloseAppointment,
    paymentPending: isPaymentPending, showBalance, canCompletePrepaid, canCollectBalance, paidAmountLabel,
  } = getAppointmentDetails(appointment);

  const requestClose = () => {
    if (!pendingAction.current) onClose();
  };

  const performAction = (operation: () => Promise<unknown>, errorMessage: string, saved = false) =>
    runExclusiveAction(pendingAction, async () => {
      setSaving(true);
      setActionError(null);
      try {
        await operation();
        if (saved) toast({ title: 'Succès', description: 'Rendez-vous mis à jour avec succès' });
        onClose();
      } catch (error) {
        setActionError(error instanceof AppointmentContactError ? error.message : errorMessage);
      } finally {
        setSaving(false);
      }
    });

  const handleSave = async () => {
    if (pendingAction.current || !canCloseAppointment) return;
    if (!editedAppointment.clientName?.trim()) {
      setActionError('Le nom du client est requis.');
      return;
    }
    await performAction(async () => onUpdate(appointment.id, editedAppointment, edit.base),
      'Modification impossible. Vos saisies sont conservées ; vérifiez votre connexion et réessayez.', true);
  };

  const handleCancel = async () => {
    if (pendingAction.current || clientDraftChanged || !canCloseAppointment) return;
    if (confirm('Annuler ce rendez-vous ? Le créneau sera libéré et l’historique sera conservé.')) {
      await performAction(() => onCancel(appointment.id),
        'Annulation non confirmée. La fiche reste ouverte ; vérifiez l’agenda avant de réessayer.');
    }
  };

  const handleNoShow = async () => {
    if (pendingAction.current || clientDraftChanged || !canCloseAppointment) return;
    if (confirm('Marquer ce client comme absent (no-show) ?')) {
      await performAction(() => onNoShow(appointment.id),
        'Absence non confirmée. La fiche reste ouverte ; vérifiez l’agenda avant de réessayer.');
    }
  };

  const handlePay = async (method: 'cash' | 'card') => {
    if (pendingAction.current || clientDraftChanged || (!canCompletePrepaid && !canCollectBalance)) return;
    await performAction(() => onPay(appointment.id, method),
      'Encaissement non confirmé. Vérifiez l’agenda et la caisse avant de réessayer.');
  };

  const modalContent = (
    <div className="agenda-touch-controls space-y-4" aria-busy={saving}>
      {saving && <p role="status" className="text-sm text-muted-foreground">Traitement en cours…</p>}
      {actionError && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{actionError}</p>}
      {changedRemotely && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">Ce rendez-vous a changé pendant votre saisie. Vos modifications sont conservées ; copiez-les avant de fermer et rouvrir la fiche.</p>}
      {/* Informations générales */}
      <div className="p-3 sm:p-4 bg-muted rounded-lg">
        <div className={`flex items-center justify-between mb-2 ${isMobile ? 'flex-col gap-2' : ''}`}>
          <div className="text-sm font-medium">
            📅 {format(appointment.startTime, isMobile ? 'dd/MM/yy' : 'EEEE d MMMM yyyy', { locale: fr })}
          </div>
          <AppointmentStatusBadge appointment={appointment} />
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {format(appointment.startTime, 'HH:mm')} - {format(appointment.endTime, 'HH:mm')}
        </div>
      </div>

      {onClientHistory && <div><Button type="button" variant="outline" className="w-full" disabled={saving || clientDraftChanged} onClick={onClientHistory}><User className="mr-2 h-4 w-4" />Historique du client</Button>{clientDraftChanged && <p className="mt-1 text-xs text-muted-foreground">Enregistrez vos modifications avant d’ouvrir l’historique.</p>}</div>}

      {/* Services */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Services</Label>
        <div className="space-y-2">
          {appointment.services.map((service) => (
            <div 
              key={service.id}
              className="rounded-xl border p-3 text-slate-800"
              style={{ backgroundColor: appointmentPalette(serviceColors[service.id] || '#64748b').background, borderColor: appointmentPalette(serviceColors[service.id] || '#64748b').border }}
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
              <span className="text-emerald-700">{paidAmountLabel}</span>
              <span className="font-semibold text-emerald-700">− {amountPaid.toFixed(2)} €</span>
            </div>
          )}
          {showBalance && <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-semibold">Reste à payer</span>
            <span className="text-lg font-bold text-slate-950">{remainingAmount.toFixed(2)} €</span>
          </div>}
        </div>
      </div>

      <Separator />

      <AppointmentTimeline appointment={appointment} />

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="startTime">Heure de début</Label><Input id="startTime" type="time" readOnly value={format(appointment.startTime, 'HH:mm')} /></div>
          <div><Label htmlFor="endTime">Heure de fin</Label><Input id="endTime" type="time" readOnly value={format(appointment.endTime, 'HH:mm')} /></div>
        </div>
        {canCloseAppointment && <><Button type="button" variant="outline" className="w-full" disabled={saving || clientDraftChanged} onClick={onReschedule}><Clock className="mr-2 h-4 w-4" />Déplacer le rendez-vous</Button>{clientDraftChanged && <p className="text-xs text-muted-foreground">Enregistrez les modifications avant de déplacer ce rendez-vous.</p>}</>}
      </div>
      <Separator />

      {/* Informations client modifiables */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="clientName">Nom du client</Label>
          <Input 
            id="clientName"
            disabled={saving}
            readOnly={!canCloseAppointment}
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
            disabled={saving}
            readOnly={!canCloseAppointment}
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
            disabled={saving}
            readOnly={!canCloseAppointment}
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
      ) : canCompletePrepaid ? (
        <div>
          <Label className="mb-2 block text-sm font-medium">Prestation déjà payée</Label>
          <p className="mb-3 text-sm text-muted-foreground">
            Aucun solde à encaisser. Clôturez simplement la prestation une fois terminée.
          </p>
          <Button disabled={saving || clientDraftChanged} onClick={() => handlePay('card')} className="w-full">
            <CreditCard className="mr-2 h-4 w-4" />
            Clôturer la prestation
          </Button>
        </div>
      ) : canCollectBalance ? (
        <div>
          <Label className="mb-1 block text-sm font-medium">Encaisser le solde</Label>
          {hasDeposit && (
            <p className="mb-3 text-xs text-muted-foreground">
              Acompte reçu : {amountPaid.toFixed(2)} € · Solde : {remainingAmount.toFixed(2)} €
            </p>
          )}
          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Button
              disabled={saving || clientDraftChanged}
              onClick={() => handlePay('cash')}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <Banknote className="mr-2 h-4 w-4" />
              Espèces · {remainingAmount.toFixed(2)} €
            </Button>
            <Button
              disabled={saving || clientDraftChanged}
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
      {clientDraftChanged && <p className="text-sm text-muted-foreground">Enregistrez vos modifications avant d’annuler, de signaler une absence ou d’encaisser.</p>}
      <div className="space-y-2 pt-4">
        {canCloseAppointment && (
          <div className={`grid gap-2 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <Button
              type="button"
              variant="outline"
              disabled={saving || clientDraftChanged}
              onClick={handleNoShow}
              className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
            >
              <UserX className="mr-2 h-4 w-4" />
              No-show
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || clientDraftChanged}
              onClick={handleCancel}
              className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Annuler le RDV
            </Button>
          </div>
        )}
        <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
          <Button type="button" variant="outline" disabled={saving} onClick={requestClose} className="flex-1">
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
        <Drawer open={isOpen} repositionInputs={false} dismissible={!saving} onOpenChange={open => { if (!open) requestClose(); }}>
          <DrawerContent className="app-mobile-drawer mt-0 overflow-hidden">
            <DrawerHeader className="shrink-0">
              <div className="flex items-center justify-between gap-2"><DrawerTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Éditer RDV
              </DrawerTitle><Button type="button" variant="outline" className="min-h-11 min-w-11" disabled={saving} onClick={requestClose}>Fermer la fiche</Button></div>
              <DrawerDescription className="sr-only">Détails du rendez-vous et modifications du client.</DrawerDescription>
            </DrawerHeader>
            <div data-vaul-no-drag className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">
              {modalContent}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={open => { if (!open) requestClose(); }}>
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
