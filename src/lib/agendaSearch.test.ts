import { describe, expect, it } from 'vitest';
import type { Appointment } from '@/data/appointments';
import { getAppointmentState, searchAppointments } from './agendaSearch';

const now = new Date('2026-10-13T12:00:00Z');
const makeAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'rdv', clientName: 'Élodie Noël', clientPhone: '+32 (471) 12-34-56',
  services: [{ id: 's1', name: 'Coupe', price: 30, duration: 30, category: 'coupe' }, { id: 's2', name: 'Soin réparateur', price: 10, duration: 15, category: 'coupe' }],
  startTime: new Date('2026-10-14T10:00:00Z'), endTime: new Date('2026-10-14T10:45:00Z'),
  status: 'scheduled', totalPrice: 40, isPaid: false, staffId: 'staff-1', ...overrides,
});

describe('agenda appointment search', () => {
  it('matches accents, case and terms across the client and every service', () => {
    const appointment = makeAppointment();
    expect(searchAppointments([appointment], 'NOEL reparateur elodie', 'all', now)).toEqual([appointment]);
    expect(searchAppointments([appointment], 'NOEL barbe', 'all', now)).toEqual([]);
  });

  it('matches phone numbers despite display punctuation', () => {
    expect(searchAppointments([makeAppointment()], '471 12 34 56', 'all', now)).toHaveLength(1);
    expect(searchAppointments([makeAppointment()], '+32 (471) 12-34-56', 'all', now)).toHaveLength(1);
    expect(searchAppointments([makeAppointment()], '999999', 'all', now)).toHaveLength(0);
  });

  it('includes ongoing appointments and excludes completed, cancelled and absent appointments from upcoming', () => {
    const appointments = [
      makeAppointment({ id: 'ongoing', startTime: new Date('2026-10-13T11:45:00Z'), endTime: new Date('2026-10-13T12:15:00Z') }),
      makeAppointment({ id: 'future' }),
      ...(['completed', 'cancelled', 'no_show'] as const).map(status => makeAppointment({ id: status, status })),
      makeAppointment({ id: 'ended', startTime: new Date('2026-10-13T11:00:00Z'), endTime: now }),
    ];
    expect(searchAppointments(appointments, '', 'upcoming', now).map(a => a.id)).toEqual(['ongoing', 'future']);
  });

  it('keeps deposits in outstanding appointments and excludes settled, refunded, expired and cancelled appointments', () => {
    const appointments = [
      makeAppointment({ id: 'unpaid' }),
      makeAppointment({ id: 'deposit', paymentStatus: 'deposit_paid', amountPaid: 10 }),
      makeAppointment({ id: 'legacy-paid', isPaid: true }),
      ...(['paid', 'refunded', 'expired'] as const).map(paymentStatus => makeAppointment({ id: paymentStatus, paymentStatus })),
      makeAppointment({ id: 'cancelled', status: 'cancelled' }),
      makeAppointment({ id: 'no_show', status: 'no_show' }),
      makeAppointment({ id: 'free', totalPrice: 0 }),
    ];
    expect(searchAppointments(appointments, '', 'unpaid', now).map(a => a.id)).toEqual(['deposit', 'unpaid']);
    expect(searchAppointments(appointments, '', 'deposit', now).map(a => a.id)).toEqual(['deposit']);
  });

  it('finds cancelled and absent appointments in history without matching active bookings', () => {
    const appointments = ['scheduled', 'cancelled', 'no_show'].map(status => makeAppointment({ id: status, status: status as Appointment['status'] }));
    expect(searchAppointments(appointments, '', 'cancelled', now).map(a => a.id)).toEqual(['cancelled', 'no_show']);
  });

  it('sorts future chronologically then history newest first without mutating source data', () => {
    const appointments = [
      makeAppointment({ id: 'old', startTime: new Date('2025-01-01T10:00:00Z'), endTime: new Date('2025-01-01T11:00:00Z') }),
      makeAppointment({ id: 'future' }),
      makeAppointment({ id: 'recent', startTime: new Date('2026-10-12T10:00:00Z'), endTime: new Date('2026-10-12T11:00:00Z') }),
    ];
    expect(searchAppointments(appointments, '   ', 'all', now).map(a => a.id)).toEqual(['future', 'recent', 'old']);
    expect(appointments.map(a => a.id)).toEqual(['old', 'future', 'recent']);
  });
});

describe('appointment labels', () => {
  it.each([
    [{ status: 'cancelled', isPaid: true }, 'Annulé'],
    [{ status: 'no_show', paymentStatus: 'deposit_paid' }, 'Absent'],
    [{ paymentStatus: 'refunded', isPaid: true }, 'Remboursé'],
    [{ paymentStatus: 'expired' }, 'Paiement expiré'],
    [{ paymentStatus: 'paid' }, 'Prépayé'],
    [{ status: 'completed', isPaid: true }, 'Payé'],
    [{ paymentStatus: 'deposit_paid' }, 'Acompte payé'],
    [{ status: 'pending_payment' }, 'Paiement en attente'],
    [{}, 'À encaisser'],
  ] as [Partial<Appointment>, string][])('prioritizes lifecycle and payment state: %j', (overrides, label) => {
    expect(getAppointmentState(makeAppointment(overrides)).label).toBe(label);
  });
});
