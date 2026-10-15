import type { Appointment } from '@/data/appointments';

/** Display/action policy only. The backend remains responsible for payment authorization. */
export function getAppointmentDetails(appointment: Appointment) {
  const amountPaid = Math.max(0, Number(appointment.amountPaid || 0));
  const remainingAmount = appointment.isPaid ? 0 : Math.max(0, appointment.totalPrice - amountPaid);
  const canEdit = appointment.status === 'scheduled' || appointment.status === 'pending_payment';
  const paymentPending = appointment.status === 'pending_payment' || appointment.paymentStatus === 'pending';
  const paymentClosed = appointment.paymentStatus === 'refunded' || appointment.paymentStatus === 'expired';
  const fullyPrepaid = appointment.totalPrice > 0 && appointment.paymentStatus === 'paid'
    && amountPaid + 0.001 >= appointment.totalPrice;
  const billable = appointment.status === 'scheduled' && !paymentPending && !paymentClosed
    && appointment.totalPrice > 0 && appointment.services.length > 0;
  return {
    amountPaid,
    remainingAmount,
    hasDeposit: amountPaid > 0 && remainingAmount > 0,
    canEdit,
    paymentPending: canEdit && paymentPending && !paymentClosed,
    showBalance: !paymentClosed && appointment.status !== 'cancelled' && appointment.status !== 'no_show',
    canCompletePrepaid: billable && fullyPrepaid,
    canCollectBalance: billable && !appointment.isPaid && appointment.paymentStatus !== 'paid' && remainingAmount > 0,
    paidAmountLabel: appointment.paymentStatus === 'refunded' ? 'Montant réglé avant remboursement' : 'Montant déjà réglé',
  };
}
