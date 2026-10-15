import { toZonedTime } from 'date-fns-tz';
import type { DatedTransaction, TransactionPaymentMethod } from './paymentStats';

export interface Transaction extends DatedTransaction {
  id: string;
  items: Array<{ id: string; name: string; price: number; quantity: number; kind?: 'service' | 'product'; type?: 'service' | 'product' }>;
  staffId?: string;
}
export type NewTransaction = Omit<Transaction, 'id' | 'transactionDate' | 'transactionInstant' | 'payments' | 'paymentMethod'> & { paymentMethod: 'cash' | 'card' };
export const paymentMethodLabel: Record<TransactionPaymentMethod, string> = {
  cash: 'Espèces', card: 'Carte', mixed: 'Paiement mixte', prepaid: 'Prépayé', unknown: 'Non renseigné',
};
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_transaction_record');
  return value as Record<string, unknown>;
};
const numeric = (value: unknown) => typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;

export function normalizeTransaction(value: unknown): Transaction {
  const row = record(value);
  const instant = new Date(String(row.transaction_date));
  const amount = numeric(row.total_amount);
  if (typeof row.id !== 'string' || !row.id || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(instant.getTime()) || !Array.isArray(row.items)) {
    throw new Error('invalid_transaction_record');
  }
  const method = row.payment_method;
  return {
    id: row.id,
    items: row.items as Transaction['items'],
    totalAmount: amount,
    paymentMethod: method === 'cash' || method === 'card' || method === 'mixed' || method === 'prepaid' ? method : 'unknown',
    transactionDate: toZonedTime(instant, 'Europe/Brussels'),
    transactionInstant: instant.toISOString(),
    clientId: typeof row.client_id === 'string' ? row.client_id : undefined,
    staffId: typeof row.staff_id === 'string' ? row.staff_id : undefined,
    payments: Array.isArray(row.transaction_payments) ? row.transaction_payments.map(value => {
      const payment = record(value);
      return { id: String(payment.id || ''), amount: numeric(payment.amount), method: String(payment.method || ''), paidAt: String(payment.paid_at || '') };
    }) : undefined,
  };
}
