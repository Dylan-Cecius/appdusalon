// Real editor with deferred synthetic operations; no network or backend.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import EditAppointmentModal from '../../src/components/EditAppointmentModal';
import type { Appointment } from '../../src/data/appointments';
import '../../src/index.css';

const appointment: Appointment = {
  id: 'fixture', clientName: 'Client test', clientPhone: '0400 00 00 00', notes: 'Note initiale',
  services: [{ id: 's1', name: 'Coupe', price: 40, duration: 30, category: 'coupe' }],
  startTime: new Date('2026-10-15T10:00:00'), endTime: new Date('2026-10-15T10:30:00'),
  status: 'scheduled', isPaid: false, totalPrice: 40, paymentStatus: 'deposit_paid', amountPaid: 10,
};
const controls = { calls: 0, resolve: () => {}, reject: () => {} };
Object.assign(window, { appointmentActionsFixture: controls });
const mutate = () => new Promise<void>((resolve, reject) => {
  controls.calls += 1;
  controls.resolve = resolve;
  controls.reject = () => reject(new Error('Synthetic failure'));
});

function Fixture() {
  const [open, setOpen] = useState(true);
  return <main><output aria-label="État de la fiche">{open ? 'Ouverte' : 'Fermée'}</output>
    <EditAppointmentModal isOpen={open} appointment={appointment} onClose={() => setOpen(false)}
      onUpdate={mutate} onPay={mutate} onCancel={mutate} onNoShow={mutate} onReschedule={() => {}} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
