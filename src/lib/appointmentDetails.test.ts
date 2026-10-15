import { describe, expect, it } from 'vitest';
import type { Appointment } from '@/data/appointments';
import { getAppointmentDetails } from './appointmentDetails';

const make = (overrides: Partial<Appointment> = {}): Appointment => ({
  id: 'test', clientName: 'Test', clientPhone: '', startTime: new Date(), endTime: new Date(),
  services: [{ id: 's1', name: 'Coupe', duration: 30, price: 40, category: 'coupe' }],
  status: 'scheduled', totalPrice: 40, amountPaid: 10, paymentStatus: 'deposit_paid', isPaid: false,
  ...overrides,
});

describe('appointment details and allowed actions', () => {
  it('offers only the outstanding balance while preserving the deposit', () => {
    const original = make();
    expect(getAppointmentDetails(original)).toMatchObject({ amountPaid: 10, remainingAmount: 30, hasDeposit: true, canCollectBalance: true, canCompletePrepaid: false });
    expect(original.amountPaid).toBe(10);
  });
  it('offers completion of a prepaid scheduled appointment without collecting again', () => {
    for (const isPaid of [true, false]) {
      expect(getAppointmentDetails(make({ isPaid, amountPaid: 40, paymentStatus: 'paid' }))).toMatchObject({ remainingAmount: 0, canCollectBalance: false, canCompletePrepaid: true });
    }
  });
  it.each(['completed', 'cancelled', 'no_show'] as const)('never offers a status action for %s, even prepaid', status => {
    for (const paymentStatus of ['unpaid', 'deposit_paid', 'paid'] as const) {
      expect(getAppointmentDetails(make({ status, paymentStatus, amountPaid: 40 }))).toMatchObject({ canEdit: false, canCollectBalance: false, canCompletePrepaid: false });
    }
  });
  it.each(['pending', 'refunded', 'expired'] as const)('does not collect or close a %s payment', paymentStatus => {
    expect(getAppointmentDetails(make({ paymentStatus }))).toMatchObject({ canCollectBalance: false, canCompletePrepaid: false });
  });
  it('blocks pending reservations even with stale payment flags', () => {
    expect(getAppointmentDetails(make({ status: 'pending_payment' }))).toMatchObject({ canEdit: true, paymentPending: true, canCollectBalance: false });
  });
  it('hides a payable balance for cancellation, absence, refunds and expired payments', () => {
    for (const overrides of [{ status: 'cancelled' }, { status: 'no_show' }, { paymentStatus: 'refunded' }, { paymentStatus: 'expired' }] as Partial<Appointment>[]) {
      expect(getAppointmentDetails(make(overrides)).showBalance).toBe(false);
    }
  });
  it('does not show a debt for legacy settled rows without amountPaid', () => {
    expect(getAppointmentDetails(make({ status: 'completed', isPaid: true, amountPaid: undefined }))).toMatchObject({ remainingAmount: 0, canCollectBalance: false });
  });
  it('does not offer settlement for empty, free or inconsistent already-paid appointments', () => {
    for (const overrides of [{ services: [] }, { totalPrice: 0 }, { paymentStatus: 'paid', amountPaid: 10 }, { isPaid: true }] as Partial<Appointment>[]) {
      expect(getAppointmentDetails(make(overrides))).toMatchObject({ canCollectBalance: false, canCompletePrepaid: false });
    }
  });
});
