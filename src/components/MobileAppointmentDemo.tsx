import { useEffect, useRef, useState } from 'react';
import type { Appointment } from '@/data/appointments';
import type { Staff } from '@/hooks/useStaff';
import { AppointmentContactError } from '@/lib/appointmentContactUpdate';
import CreateAppointmentDialog from './agenda/CreateAppointmentDialog';
import EditAppointmentModal from './EditAppointmentModal';
import { Button } from './ui/button';

const service = { id: 'synthetic-service', name: 'Prestation fictive', price: 20, duration: 30, category: 'coupe' as const, color: '#c7d2fe' };
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const staff: Staff[] = [{ id: 'synthetic-staff', name: 'Équipe fictive', salon_id: 'synthetic-salon', auth_user_id: null, role: 'coiffeur', color: '#c7d2fe', phone: null, email: null, commission_rate: 0, is_active: true, start_time: '09:00', end_time: '19:00', working_days: days, daily_schedules: Object.fromEntries(days.map(day => [day, { start: '09:00', end: '19:00' }])), created_at: '2026-01-01T00:00:00Z' }];
function initialAppointment(): Appointment {
  const startTime = new Date(); startTime.setDate(startTime.getDate() + 1); startTime.setHours(12, 0, 0, 0);
  return { id: 'synthetic-appointment', updatedAt: 'revision-1', clientName: 'Client fictif', clientPhone: '000-test', notes: 'Note fictive', staffId: staff[0].id, startTime, endTime: new Date(startTime.getTime() + 30 * 60000), services: [service], totalPrice: 20, status: 'scheduled', isPaid: false, paymentStatus: 'unpaid' };
}

/** Offline fixture: production dialogs, synthetic responses, no backend/native imports. */
export default function MobileAppointmentDemo() {
  const [appointment, setAppointment] = useState(initialAppointment);
  const latest = useRef(appointment); latest.current = appointment;
  const [mode, setMode] = useState<'create' | 'edit' | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const fail = new URLSearchParams(location.search).get('failure') === '1';
  useEffect(() => {
    const refresh = () => setAppointment(current => ({ ...current, notes: 'Note distante fictive', updatedAt: 'revision-2' }));
    window.addEventListener('demo:appointment-refresh', refresh);
    return () => window.removeEventListener('demo:appointment-refresh', refresh);
  }, []);
  const save = async () => {
    setAttempts(value => value + 1);
    // Simulated latency makes pending controls testable without any network request.
    await new Promise(resolve => setTimeout(resolve, 400));
    if (fail) throw new AppointmentContactError('Échec simulé. Vos saisies sont conservées.');
  };
  const unsupported = async () => { throw new Error('Action hors scénario de cette fixture.'); };
  return <main className="app-safe-shell bg-slate-50 p-4">
    <h1 className="text-2xl font-semibold">Démonstration des rendez-vous mobiles</h1>
    <p className="my-4">Données fictives. Aucun message, paiement ni connexion.</p>
    <div className="flex flex-wrap gap-3">
      <Button className="min-h-11" onClick={() => setMode('create')}>Créer un rendez-vous fictif</Button>
      <Button className="min-h-11" onClick={() => setMode('edit')}>Ouvrir la fiche fictive</Button>
    </div>
    <p data-testid="save-attempts" className="mt-4">Tentatives simulées : {attempts}</p>
    {confirmed && <p role="status">Enregistrement fictif confirmé.</p>}
    {mode === 'create' && <CreateAppointmentDialog isOpen onClose={() => setMode(null)} selectedDate={appointment.startTime} selectedTimeSlot="12:00" staffId={staff[0].id} services={[service]} staff={staff} appointments={[]} timeOff={[]} demo
      schedule={() => ({ day_of_week: 0, is_open: true, open_time: '09:00', close_time: '19:00', break_start: null, break_end: null })}
      onSave={async () => { await save(); setConfirmed(true); }} />}
    {mode === 'edit' && <EditAppointmentModal isOpen onClose={() => setMode(null)} appointment={appointment} serviceColors={{ [service.id]: service.color }} onReschedule={() => {}}
      onCancel={unsupported} onNoShow={unsupported} onPay={unsupported}
      onUpdate={async (id, updates, original) => {
        await save();
        if (id !== latest.current.id || original.updatedAt !== latest.current.updatedAt) throw new AppointmentContactError('Révision modifiée. Vos saisies sont conservées.');
        setAppointment(current => ({ ...current, ...updates, updatedAt: 'revision-saved' })); setConfirmed(true);
      }} />}
  </main>;
}
