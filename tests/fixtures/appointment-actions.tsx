// Real editor with deferred synthetic operations; no network or backend.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import EditAppointmentModal from '../../src/components/EditAppointmentModal';
import type { Appointment } from '../../src/data/appointments';
import '../../src/index.css';

const params = new URLSearchParams(location.search);
const appointment: Appointment = {
  id: 'fixture', clientName: 'Client test', clientPhone: '0400 00 00 00', notes: 'Note initiale',
  services: [{ id: 's1', name: 'Coupe', price: 40, duration: 30, category: 'coupe' }],
  startTime: new Date('2026-10-15T10:00:00'), endTime: new Date('2026-10-15T10:30:00'),
  status: (params.get('status') || 'scheduled') as Appointment['status'], isPaid: params.get('settled') === 'true',
  totalPrice: 40, paymentStatus: (params.get('payment') || 'deposit_paid') as Appointment['paymentStatus'],
  amountPaid: params.get('payment') === 'paid' ? 40 : 10,
};
const controls = { calls: 0, resolve: () => {}, reject: () => {} };
Object.assign(window, { appointmentActionsFixture: controls });
const mutate = () => new Promise<void>((resolve, reject) => {
  controls.calls += 1;
  controls.resolve = resolve;
  controls.reject = () => reject(new Error('Synthetic failure'));
});

export function Fixture() {
  const [open, setOpen] = useState(true);
  return <main><output aria-label="État de la fiche">{open ? 'Ouverte' : 'Fermée'}</output>
    <EditAppointmentModal isOpen={open} appointment={appointment} onClose={() => setOpen(false)}
      onUpdate={mutate} onPay={mutate} onCancel={mutate} onNoShow={mutate} onReschedule={() => {}} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
