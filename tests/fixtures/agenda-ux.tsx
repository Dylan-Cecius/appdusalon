// Isolated UI fixture: real agenda components, deterministic synthetic data, no backend.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import AgendaHeader, { type AgendaViewMode } from '../../src/components/agenda/AgendaHeader';
import AgendaSearchDialog from '../../src/components/agenda/AgendaSearchDialog';
import type { Appointment } from '../../src/data/appointments';
import '../../src/index.css';

const date = new Date('2026-10-13T10:00:00');
const appointments: Appointment[] = Array.from({ length: 35 }, (_, index) => ({
  id: String(index), clientName: index === 0 ? 'Élodie Noël' : `Client test ${index}`,
  clientPhone: index === 0 ? '+32 (471) 12-34-56' : '0400 00 00 00',
  services: [{ id: 's1', name: index === 0 ? 'Soin réparateur' : 'Coupe', price: 40, duration: 45, category: 'coupe' }],
  startTime: date, endTime: new Date(date.getTime() + 45 * 60_000),
  status: 'scheduled', isPaid: false, totalPrice: 40, staffId: 'staff-1',
  paymentStatus: index === 0 ? 'deposit_paid' : 'unpaid',
}));

export function Fixture() {
  const [selectedDate, setSelectedDate] = useState(date);
  const [viewMode, setViewMode] = useState<AgendaViewMode>('day');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selection, setSelection] = useState('');
  return <main className="mx-auto max-w-5xl p-4">
    <AgendaHeader selectedDate={selectedDate} onDateChange={setSelectedDate} viewMode={viewMode} onViewModeChange={setViewMode} onAddClick={() => setSelection('Nouveau rendez-vous')} onWaitlistClick={() => setSelection('Liste d’attente ouverte')} waitlistCount={2} onSearchClick={() => setSearchOpen(true)} />
    <AgendaSearchDialog open={searchOpen} onOpenChange={setSearchOpen} appointments={appointments} loading={false} members={[{ id: 'staff-1', name: 'Dylan' }]} onSelect={appointment => { setSelectedDate(appointment.startTime); setSelection(appointment.clientName); }} />
    <output aria-label="Action sélectionnée">{selection}</output>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
