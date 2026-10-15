import type { ClientStats } from './clients';
import { readCompleteRows, type RowPage } from './readCompleteRows';
export interface ClientStatsTransaction { id: string; total_amount: number | string; transaction_date: string; appointment_id?: string | null }
export interface ClientStatsAppointment { id: string; start_time: string; status: string }

/** Recorded passages: completed appointments plus sales, deduplicated only by an explicit link. */
export function calculateClientStats(transactions: ClientStatsTransaction[], appointments: ClientStatsAppointment[], now: Date): ClientStats {
  if (!Number.isFinite(now.getTime())) throw new Error('invalid_stats_date');
  let cents = 0;
  const passages = new Map<string, number>();
  const ids = new Set<string>();
  for (const transaction of transactions) {
    if (!transaction.id || ids.has(transaction.id)) throw new Error('duplicate_transaction');
    ids.add(transaction.id);
    const amount = Number(transaction.total_amount);
    const at = Date.parse(transaction.transaction_date);
    if (!['number', 'string'].includes(typeof transaction.total_amount) || String(transaction.total_amount).trim() === '' || (transaction.appointment_id != null && typeof transaction.appointment_id !== 'string') || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(at)) throw new Error('invalid_transaction');
    if (at > now.getTime()) continue;
    cents += Math.round(amount * 100);
    passages.set(transaction.appointment_id ? `appointment:${transaction.appointment_id}` : `transaction:${transaction.id}`, at);
  }
  const appointmentIds = new Set<string>();
  for (const appointment of appointments) {
    if (!appointment.id || appointmentIds.has(appointment.id)) throw new Error('duplicate_appointment');
    appointmentIds.add(appointment.id);
    if (appointment.status !== 'completed') continue;
    const at = Date.parse(appointment.start_time);
    if (!Number.isFinite(at)) throw new Error('invalid_appointment');
    if (at <= now.getTime()) passages.set(`appointment:${appointment.id}`, at);
  }
  let latest: number | null = null;
  for (const at of passages.values()) if (latest === null || at > latest) latest = at;
  return { totalSpent: cents / 100, visitCount: passages.size, lastVisit: latest === null ? null : new Date(latest).toISOString() };
}

export async function readClientStats(
  readTransactions: (from: number, to: number) => Promise<RowPage<ClientStatsTransaction>>,
  readAppointments: (from: number, to: number) => Promise<RowPage<ClientStatsAppointment>>,
  current: () => boolean,
  now: Date,
  pageSize = 500,
): Promise<ClientStats | null> {
  const [transactions, appointments] = await Promise.all([
    readCompleteRows(readTransactions, current, pageSize),
    readCompleteRows(readAppointments, current, pageSize),
  ]);
  if (!current() || transactions === null || appointments === null) return null;
  return calculateClientStats(transactions, appointments, now);
}
