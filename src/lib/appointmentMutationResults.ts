import type { Appointment } from '@/data/appointments';

const money = (value: unknown): number | undefined => {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export function confirmedCancellation(data: unknown) {
  if (!data || typeof data !== 'object' || !('success' in data) || data.success !== true
    || !('status' in data) || (data.status !== 'cancelled' && data.status !== 'no_show')) {
    throw new Error('appointment_cancellation_unconfirmed');
  }
  const result = data as Record<string, unknown>;
  return {
    status: data.status as 'cancelled' | 'no_show',
    alreadyClosed: result.already_closed === true,
    refundStatus: typeof result.refund_status === 'string' ? result.refund_status : 'not_applicable',
    refundAmount: money(result.refund_amount),
    depositKept: money(result.deposit_kept),
  };
}

export function cancelledAppointment(appointment: Appointment, result: ReturnType<typeof confirmedCancellation>): Appointment {
  return {
    ...appointment,
    status: result.status,
    paymentStatus: result.refundStatus === 'refunded' ? 'refunded'
      : result.status === 'cancelled' && appointment.paymentStatus === 'pending' ? 'expired'
        : appointment.paymentStatus,
    paymentExpiresAt: undefined,
  };
}

export function confirmedSettlement(data: unknown, appointmentId: string, salonId: string) {
  const record = Array.isArray(data) && data.length === 1 ? data[0] : data;
  const result = record && typeof record === 'object' ? record as Record<string, unknown> : {};
  const amount = money(result.total_amount);
  if (typeof result.id !== 'string' || !result.id || result.appointment_id !== appointmentId
    || result.salon_id !== salonId || amount === undefined || amount <= 0) {
    throw new Error('appointment_settlement_unconfirmed');
  }
  return {
    patch: { isPaid: true, status: 'completed', paymentStatus: 'paid', amountPaid: amount } as const,
    prepaid: result.payment_method === 'prepaid',
  };
}
