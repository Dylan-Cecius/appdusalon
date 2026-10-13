import { useEffect, useState } from 'react';
import { addDays, format } from 'date-fns';
import { RotateCcw } from 'lucide-react';
import type { Appointment } from '@/data/appointments';
import type { Staff } from '@/hooks/useStaff';
import type { DaySchedule } from '@/hooks/useOpeningHours';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';
import AgendaWorkspace, { type AgendaCreateDialogProps } from './AgendaWorkspace';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const members: Staff[] = ['Dylan', 'Marie', 'Thomas'].map((name, index) => ({
  id: `demo-staff-${index}`, name, auth_user_id: null, salon_id: 'preview',
  role: 'coiffeur', color: ['#4f46e5', '#db2777', '#059669'][index],
  phone: null, email: null, commission_rate: 0, is_active: true,
  start_time: '09:00', end_time: '19:00', working_days: dayNames,
  daily_schedules: Object.fromEntries(dayNames.map(day => [day, { start: '09:00', end: '19:00' }])),
  created_at: '2026-01-01T00:00:00Z',
}));
const services = [
  { id: 'demo-coupe', name: 'Coupe homme', price: 25, duration: 30, category: 'coupe' as const, color: '#4f46e5' },
  { id: 'demo-barbe', name: 'Coupe + barbe', price: 35, duration: 45, category: 'combo' as const, color: '#059669' },
  { id: 'demo-couleur', name: 'Coloration & soin', price: 75, duration: 90, category: 'coupe' as const, color: '#db2777' },
];
const storageKey = `appdusalon-agenda-preview-v1-${format(new Date(), 'yyyy-MM-dd')}`;
const schedule = (date: Date): DaySchedule => ({ day_of_week: (date.getDay() + 6) % 7, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null });
const refresh = async () => {};

function seedAppointments(): Appointment[] {
  return ['Élodie Noël', 'Lucas Bernard', 'Emma Dubois', 'Jean Dupont', 'Julie Simon', 'Nicolas Petit', 'Sophie Martin', 'Alex Leroy', 'Camille Laurent', 'Léa Moreau', 'Maxime Denis', 'Louise Perrin', 'Arthur Simon', 'Maya André', 'Paul Robert'].map((clientName, index) => {
    const service = services[index % services.length];
    const startTime = addDays(new Date(), index < 9 ? 0 : index < 12 ? 1 : -1);
    startTime.setHours(9 + Math.floor((index % 9) / 3) * 3, index % 3 === 0 ? 30 : 0, 0, 0);
    const paymentStatus = index === 0 ? 'deposit_paid' : index === 1 ? 'paid' : 'unpaid';
    return {
      id: `demo-rdv-${index}`, clientName, clientPhone: `0000 00 00 ${String(index).padStart(2, '0')}`,
      services: [service], startTime, endTime: new Date(startTime.getTime() + service.duration * 60_000),
      status: index >= 12 ? 'completed' : 'scheduled', totalPrice: service.price,
      isPaid: index >= 12, paymentStatus: index >= 12 ? 'paid' : paymentStatus,
      amountPaid: index >= 12 || paymentStatus === 'paid' ? service.price : index === 0 ? 10 : 0,
      depositRequired: index === 0 ? 10 : 0, staffId: members[index % 3].id,
      notes: 'Rendez-vous fictif pour tester l’agenda.',
    };
  });
}

function loadAppointments(): Appointment[] {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (Array.isArray(stored)) {
      const restored = stored.map(item => ({ ...item, startTime: new Date(item.startTime), endTime: new Date(item.endTime) }));
      if (restored.every(item => item.id && typeof item.clientName === 'string' && Array.isArray(item.services) && Number.isFinite(item.startTime.getTime()) && Number.isFinite(item.endTime.getTime()))) return restored;
    }
  } catch { /* A blocked or obsolete local store must not prevent previewing. */ }
  return seedAppointments();
}

function seedWaitlist(): BookingWaitlistEntry[] {
  return ['Alice Démo', 'Hugo Démo'].map((client_name, index) => ({
    id: `demo-wait-${index}`, salon_id: 'preview', service_id: services[index].id,
    preferred_staff_id: members[index].id, client_name, client_phone: '0000 00 00 00',
    preferred_date_from: format(new Date(), 'yyyy-MM-dd'), preferred_date_to: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
    preferred_time_start: '09:00', preferred_time_end: '18:00', status: 'active',
    notification_count: 0, last_notified_at: null, offer_expires_at: null,
    created_at: new Date().toISOString(), service: { name: services[index].name }, preferred_staff: { name: members[index].name },
  }));
}

function validateAppointment(candidate: Appointment, appointments: Appointment[]) {
  const start = new Date(candidate.startTime), end = new Date(candidate.endTime);
  if (!candidate.clientName.trim() || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || format(start, 'yyyy-MM-dd') !== format(end, 'yyyy-MM-dd')) throw new Error('Vérifiez le nom et la durée du rendez-vous.');
  if (start.getHours() < 9 || end.getHours() > 19 || (end.getHours() === 19 && end.getMinutes() > 0)) throw new Error('Choisissez un horaire entre 9 h et 19 h.');
  if (appointments.some(other => other.id !== candidate.id && other.staffId === candidate.staffId && !['cancelled', 'no_show'].includes(other.status) && new Date(other.startTime) < end && new Date(other.endTime) > start)) throw new Error('Ce collaborateur a déjà un rendez-vous à cet horaire.');
}

function CreatePreviewAppointment({ isOpen, onClose, selectedDate, selectedTimeSlot, staffId, onCreate }: AgendaCreateDialogProps & { onCreate: (appointment: Appointment) => void }) {
  const [error, setError] = useState('');
  return <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl">
      <DialogHeader><DialogTitle>Nouveau rendez-vous</DialogTitle><DialogDescription>Testez librement avec un client fictif. Aucun message ne sera envoyé.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={event => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const service = services.find(item => item.id === data.get('service'))!;
        const startTime = new Date(`${data.get('date')}T${data.get('time')}:00`);
        try {
          onCreate({ id: crypto.randomUUID(), clientName: String(data.get('name')).trim(), clientPhone: String(data.get('phone') || ''), services: [service], staffId: String(data.get('staff')), startTime, endTime: new Date(startTime.getTime() + service.duration * 60_000), totalPrice: service.price, status: 'scheduled', paymentStatus: 'unpaid', isPaid: false, amountPaid: 0, notes: 'Créé dans la démonstration.' });
          onClose();
        } catch (err) { setError(err instanceof Error ? err.message : 'Créneau indisponible.'); }
      }}>
        <div><Label htmlFor="preview-name">Nom du client fictif</Label><Input id="preview-name" name="name" required autoComplete="off" placeholder="Ex. Alex Démo" /></div>
        <div><Label htmlFor="preview-phone">Téléphone fictif</Label><Input id="preview-phone" name="phone" placeholder="0000 00 00 00" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label htmlFor="preview-date">Date</Label><Input id="preview-date" name="date" type="date" required defaultValue={format(selectedDate, 'yyyy-MM-dd')} /></div>
          <div><Label htmlFor="preview-time">Heure</Label><Input id="preview-time" name="time" type="time" required min="09:00" max="18:30" step={900} defaultValue={selectedTimeSlot || '17:00'} /></div>
        </div>
        <div><Label htmlFor="preview-staff">Collaborateur</Label><select id="preview-staff" name="staff" defaultValue={staffId || members[0].id} className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm">{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
        <div><Label htmlFor="preview-service">Prestation</Label><select id="preview-service" name="service" className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm">{services.map(service => <option key={service.id} value={service.id}>{service.name} · {service.duration} min · {service.price} €</option>)}</select></div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full">Créer le rendez-vous</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

export default function PreviewAgenda() {
  const [appointments, setAppointments] = useState(loadAppointments);
  const [waitlist, setWaitlist] = useState(seedWaitlist);
  const [revision, setRevision] = useState(0);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(appointments)); } catch { /* Session remains usable without persistence. */ } }, [appointments]);
  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const original = appointments.find(item => item.id === id);
    if (!original) throw new Error('Rendez-vous introuvable');
    const next = { ...original, ...updates };
    validateAppointment(next, appointments);
    setAppointments(current => current.map(item => item.id === id ? next : item));
  };

  return <TooltipProvider>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
      <div><p className="text-sm font-semibold text-indigo-950">Essayez le nouvel agenda</p><p className="mt-1 text-xs text-indigo-800">Recherchez, créez, déplacez et modifiez les rendez-vous. Données fictives, paiements simulés.</p></div>
      <Button type="button" variant="outline" size="sm" onClick={() => { setAppointments(seedAppointments()); setWaitlist(seedWaitlist()); setRevision(value => value + 1); toast({ title: 'Démonstration réinitialisée' }); }}><RotateCcw className="mr-2 h-3.5 w-3.5" />Réinitialiser la démo</Button>
    </div>
    <AgendaWorkspace key={revision}
      appointments={appointments} appointmentsLoading={false} dbServices={services} activeStaff={members}
      getScheduleForDate={schedule} hasOpeningHours={true} waitlistEntries={waitlist} waitlistLoading={false}
      cancelWaitlistEntry={async id => { setWaitlist(current => current.filter(item => item.id !== id)); }}
      updateAppointment={updateAppointment} refreshAppointments={refresh}
      markAsPaid={async id => { setAppointments(current => current.map(item => item.id === id ? { ...item, status: 'completed', paymentStatus: 'paid', isPaid: true, amountPaid: item.totalPrice } : item)); toast({ title: 'Paiement simulé', description: 'Le rendez-vous est maintenant marqué payé.' }); }}
      cancelAppointment={async (id, action) => { setAppointments(current => current.map(item => item.id === id ? { ...item, status: action === 'cancel' ? 'cancelled' : 'no_show' } : item)); }}
      renderCreateDialog={props => props.isOpen ? <CreatePreviewAppointment {...props} onCreate={appointment => { validateAppointment(appointment, appointments); setAppointments(current => [...current, appointment]); toast({ title: 'Rendez-vous de démonstration créé' }); }} /> : null}
    />
    <Toaster />
  </TooltipProvider>;
}
