import { eachDayOfInterval, format, isValid } from 'date-fns';
import { buildPaymentStats, transactionSalonDay, type DatedTransaction, type PaymentTransaction } from './paymentStats';
export type PaymentFilter = 'all' | 'cash' | 'card' | 'prepaid' | 'unallocated';
export const paymentReportFilters: { key: PaymentFilter; label: string }[] = [
  { key: 'all', label: 'Tous' }, { key: 'cash', label: 'Espèces' }, { key: 'card', label: 'Carte' },
  { key: 'prepaid', label: 'Acomptes / prépaiements' }, { key: 'unallocated', label: 'Non renseigné' },
];
export interface PaymentReport {
  transactions: number; cashAmount: number; cardAmount: number; prepaidAmount: number; unallocatedAmount: number; totalAmount: number;
}
export const paymentReportExplanation = 'Montants des ventes enregistrées à la date du salon (Europe/Brussels). Un filtre retient seulement la part correspondante, y compris dans une vente mixte. Les acomptes et prépaiements peuvent avoir été reçus avant cette période.';
export function paymentReport(transactions: readonly PaymentTransaction[], filter: PaymentFilter = 'all'): PaymentReport {
  const stats = buildPaymentStats(transactions);
  return {
    transactions: filter === 'all' ? stats.transactionCount : stats[filter],
    cashAmount: filter === 'all' || filter === 'cash' ? stats.cashAmount : 0,
    cardAmount: filter === 'all' || filter === 'card' ? stats.cardAmount : 0,
    prepaidAmount: filter === 'all' || filter === 'prepaid' ? stats.prepaidAmount : 0,
    unallocatedAmount: filter === 'all' || filter === 'unallocated' ? stats.unallocatedAmount : 0,
    totalAmount: filter === 'all' ? stats.totalAmount : stats[`${filter}Amount`],
  };
}
export const paymentAmountFor = (tx: PaymentTransaction, filter: PaymentFilter) => paymentReport([tx], filter).totalAmount;
export const validReportRange = (start: Date, end: Date) => isValid(start) && isValid(end) && start <= end;
export function dailyPaymentReports(transactions: readonly DatedTransaction[], start: Date, end: Date, filter: PaymentFilter = 'all') {
  if (!validReportRange(start, end)) return [];
  const byDay = new Map<string, DatedTransaction[]>();
  for (const tx of transactions) {
    const key = transactionSalonDay(tx);
    const day = byDay.get(key) || []; day.push(tx); byDay.set(key, day);
  }
  return eachDayOfInterval({ start, end }).map(date => ({ date, ...paymentReport(byDay.get(format(date, 'yyyy-MM-dd')) || [], filter) }));
}
export function sumPaymentReports(reports: readonly PaymentReport[]): PaymentReport {
  const sum = (field: Exclude<keyof PaymentReport, 'transactions'>) => reports.reduce((value, report) => value + Math.round(report[field] * 100), 0) / 100;
  return { transactions: reports.reduce((value, report) => value + report.transactions, 0), cashAmount: sum('cashAmount'), cardAmount: sum('cardAmount'), prepaidAmount: sum('prepaidAmount'), unallocatedAmount: sum('unallocatedAmount'), totalAmount: sum('totalAmount') };
}
