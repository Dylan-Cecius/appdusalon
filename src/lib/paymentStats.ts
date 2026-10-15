import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export type TransactionPaymentMethod = 'cash' | 'card' | 'mixed' | 'prepaid' | 'unknown';
export interface TransactionPayment {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
}
export interface PaymentTransaction {
  totalAmount: number;
  paymentMethod: TransactionPaymentMethod;
  payments?: TransactionPayment[];
}
export interface DatedTransaction extends PaymentTransaction {
  // Existing screens use a salon wall-clock Date. Preserve the original instant separately.
  transactionDate: Date;
  transactionInstant?: string;
  clientId?: string;
}
export interface PaymentStats {
  cash: number; card: number; prepaid: number; unallocated: number;
  cashAmount: number; cardAmount: number; prepaidAmount: number; unallocatedAmount: number;
  cashPercent: number; cardPercent: number; prepaidPercent: number; unallocatedPercent: number;
  transactionCount: number; totalAmount: number;
}
const cents = (amount: number) => Math.round(amount * 100);

/** Funding of sales recorded in the selected period, NOT a cash-flow report by paid_at. */
export function buildPaymentStats(transactions: readonly PaymentTransaction[]): PaymentStats {
  const buckets = { cash: 0, card: 0, prepaid: 0, unallocated: 0 };
  const counts = { cash: 0, card: 0, prepaid: 0, unallocated: 0 };
  let total = 0;
  for (const tx of transactions) {
    if (!Number.isFinite(tx.totalAmount) || tx.totalAmount < 0) throw new Error('invalid_transaction_amount');
    const amount = cents(tx.totalAmount);
    total += amount;
    const parts = { cash: 0, card: 0, prepaid: 0, unallocated: 0 };
    if (tx.payments?.length) {
      const ids = new Set<string>();
      let invalid = false;
      for (const payment of tx.payments) {
        if (!payment.id || ids.has(payment.id) || !Number.isFinite(payment.amount) || payment.amount <= 0) { invalid = true; break; }
        ids.add(payment.id);
        const key = payment.method === 'stripe_booking' ? 'prepaid' : payment.method;
        if (key !== 'cash' && key !== 'card' && key !== 'prepaid') { invalid = true; break; }
        parts[key] += cents(payment.amount);
      }
      const allocated = parts.cash + parts.card + parts.prepaid;
      if (invalid || allocated > amount) {
        parts.cash = parts.card = parts.prepaid = 0;
        parts.unallocated = amount;
      } else parts.unallocated = amount - allocated;
    } else if (tx.paymentMethod === 'cash' || tx.paymentMethod === 'card' || tx.paymentMethod === 'prepaid') {
      parts[tx.paymentMethod] = amount;
    } else parts.unallocated = amount;
    for (const key of Object.keys(parts) as (keyof typeof parts)[]) {
      buckets[key] += parts[key];
      if (parts[key] > 0) counts[key]++;
    }
  }
  const percent = (amount: number) => total ? amount / total * 100 : 0;
  return {
    ...counts,
    cashAmount: buckets.cash / 100, cardAmount: buckets.card / 100,
    prepaidAmount: buckets.prepaid / 100, unallocatedAmount: buckets.unallocated / 100,
    cashPercent: percent(buckets.cash), cardPercent: percent(buckets.card),
    prepaidPercent: percent(buckets.prepaid), unallocatedPercent: percent(buckets.unallocated),
    transactionCount: transactions.length, totalAmount: total / 100,
  };
}

export function transactionSalonDay(tx: Pick<DatedTransaction, 'transactionDate' | 'transactionInstant'>): string {
  return tx.transactionInstant
    ? formatInTimeZone(new Date(tx.transactionInstant), 'Europe/Brussels', 'yyyy-MM-dd')
    : format(tx.transactionDate, 'yyyy-MM-dd');
}

export function buildCombinedStats<T extends DatedTransaction>(transactions: readonly T[], now = new Date()) {
  const today = formatInTimeZone(now, 'Europe/Brussels', 'yyyy-MM-dd');
  const calendar = new Date(`${today}T12:00:00Z`);
  const weekday = calendar.getUTCDay() || 7;
  calendar.setUTCDate(calendar.getUTCDate() - weekday + 1);
  const weekStart = calendar.toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';
  const previous = new Date(`${monthStart}T12:00:00Z`);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  const previousStart = previous.toISOString().slice(0, 10);
  const dated = transactions.map(tx => ({ tx, day: transactionSalonDay(tx) }));
  const range = (start: string, end: string) => dated.filter(({ day }) => day >= start && day <= end).map(({ tx }) => tx);
  const daily = range(today, today), weekly = range(weekStart, today), monthly = range(monthStart, today);
  const previousMonth = dated.filter(({ day }) => day >= previousStart && day < monthStart).map(({ tx }) => tx);
  const revenue = (list: readonly T[]) => list.reduce((sum, tx) => sum + cents(tx.totalAmount), 0) / 100;
  const clients = (list: readonly T[]) => new Set(list.map(tx => tx.clientId).filter(Boolean)).size + list.filter(tx => !tx.clientId).length;
  return {
    todayRevenue: revenue(daily), todayClients: clients(daily),
    weeklyRevenue: revenue(weekly), weeklyClients: clients(weekly),
    monthlyRevenue: revenue(monthly), monthlyClients: clients(monthly), previousMonthRevenue: revenue(previousMonth),
    paymentStats: { today: buildPaymentStats(daily), weekly: buildPaymentStats(weekly), monthly: buildPaymentStats(monthly) },
  };
}
