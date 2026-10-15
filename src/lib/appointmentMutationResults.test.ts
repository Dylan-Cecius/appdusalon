import { describe, expect, it } from 'vitest';
import type { Appointment } from '@/data/appointments';
import { cancelledAppointment, confirmedCancellation, confirmedSettlement } from './appointmentMutationResults';

const appointment = { id: 'rdv', status: 'scheduled', paymentStatus: 'deposit_paid', amountPaid: 10, depositRequired: 10, totalPrice: 40, isPaid: false } as Appointment;
const transaction = { id: 'transaction', appointment_id: 'rdv', salon_id: 'salon', total_amount: '40.00', payment_method: 'mixed' };

describe('confirmed appointment mutations', () => {
  it('uses the server status when a repeated request finds an already closed appointment', () => {
    const result = confirmedCancellation({ success: true, already_closed: true, status: 'cancelled', refund_status: 'refunded' });
    expect(cancelledAppointment(appointment, result)).toMatchObject({ status: 'cancelled', paymentStatus: 'refunded', amountPaid: 10 });
    expect(result.alreadyClosed).toBe(true);
    expect(result.refundAmount).toBeUndefined();
  });
  it('preserves the deposit on absence without claiming a refund', () => {
    const result = confirmedCancellation({ success: true, status: 'no_show', deposit_kept: 10 });
    expect(cancelledAppointment(appointment, result)).toMatchObject({ status: 'no_show', paymentStatus: 'deposit_paid', amountPaid: 10, depositRequired: 10 });
    expect(appointment.status).toBe('scheduled');
  });
  it('expires a cancelled pending payment but preserves a pending flag on absence, matching backend behavior', () => {
    const pending = { ...appointment, paymentStatus: 'pending' as const, paymentExpiresAt: new Date() };
    for (const status of ['cancelled', 'no_show']) {
      expect(cancelledAppointment(pending, confirmedCancellation({ success: true, status }))).toMatchObject({ paymentStatus: status === 'cancelled' ? 'expired' : 'pending', paymentExpiresAt: undefined });
    }
  });
  it('keeps the cancellation and refund failure distinct', () => {
    const result = confirmedCancellation({ success: true, status: 'cancelled', refund_status: 'failed', refund_amount: 10 });
    expect(result.refundStatus).toBe('failed');
    expect(cancelledAppointment(appointment, result)).toMatchObject({ status: 'cancelled', paymentStatus: 'deposit_paid', amountPaid: 10 });
  });
  it('rejects missing, unsuccessful or unexpected cancellation payloads', () => {
    for (const data of [null, {}, { success: false, status: 'cancelled' }, { success: true, status: 'scheduled' }]) {
      expect(() => confirmedCancellation(data)).toThrow('unconfirmed');
    }
  });
  it('uses the confirmed transaction total to update all local payment flags', () => {
    expect(confirmedSettlement(transaction, 'rdv', 'salon')).toEqual({ patch: { isPaid: true, status: 'completed', paymentStatus: 'paid', amountPaid: 40 }, prepaid: false });
    expect(confirmedSettlement({ ...transaction, payment_method: 'prepaid' }, 'rdv', 'salon').prepaid).toBe(true);
  });
  it('rejects a wrong appointment/salon, missing transaction or invalid amount', () => {
    for (const data of [null, {}, { ...transaction, id: '' }, { ...transaction, appointment_id: 'other' }, { ...transaction, salon_id: 'other' }, ...[null, '', -1, 0, 'NaN', Infinity].map(total_amount => ({ ...transaction, total_amount }))]) {
      expect(() => confirmedSettlement(data, 'rdv', 'salon')).toThrow('unconfirmed');
    }
  });
});
