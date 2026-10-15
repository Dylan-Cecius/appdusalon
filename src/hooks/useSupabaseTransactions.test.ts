import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/contexts/TransactionsContext', () => ({ useTransactions: vi.fn() }));
import { useTransactions, type Transaction } from '@/contexts/TransactionsContext';
import { useSupabaseTransactions } from './useSupabaseTransactions';

function fixture() {
  const transactions: Transaction[] = [
    { id: 'today', items: [], totalAmount: 30, paymentMethod: 'card', transactionDate: new Date(2026, 9, 15, 10), clientId: 'client', staffId: 'staff' },
    { id: 'week', items: [], totalAmount: 20, paymentMethod: 'cash', transactionDate: new Date(2026, 9, 13, 10) },
    { id: 'month', items: [], totalAmount: 10, paymentMethod: 'cash', transactionDate: new Date(2026, 9, 2, 10) },
  ];
  const context = { transactions, loading: false, addTransaction: vi.fn(), deleteTransaction: vi.fn(), refreshTransactions: vi.fn() };
  vi.mocked(useTransactions).mockReturnValue(context);
  return context;
}
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe('shared transaction feed compatibility', () => {
  it('exposes the same rows, associations and mutation handlers to every consumer', () => {
    const context = fixture(); const result = useSupabaseTransactions();
    expect(result.transactions).toBe(context.transactions);
    expect(result.transactions[0]).toMatchObject({ clientId: 'client', staffId: 'staff' });
    expect(result.addTransaction).toBe(context.addTransaction);
    expect(result.deleteTransaction).toBe(context.deleteTransaction);
    expect(result.refreshTransactions).toBe(context.refreshTransactions);
  });
  it('retains daily, weekly, monthly totals and payment counts', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 15, 15)); fixture();
    expect(useSupabaseTransactions().getStats()).toMatchObject({
      todayRevenue: 30, weeklyRevenue: 50, monthlyRevenue: 60,
      todayClients: 1, weeklyClients: 2, monthlyClients: 3,
      paymentStats: { today: { cash: 0, card: 1, cardPercent: 100 }, weekly: { cash: 1, card: 1, cardPercent: 50 } },
    });
  });
  it('retains inclusive custom range filtering without changing the shared array', () => {
    const context = fixture();
    const result = useSupabaseTransactions().getCustomStats(new Date(2026, 9, 13, 10), new Date(2026, 9, 15, 10));
    expect(result.totalRevenue).toBe(50); expect(result.totalClients).toBe(2);
    expect(context.transactions).toHaveLength(3);
  });
  it('observes the empty/loading feed when the provider changes scope', () => {
    fixture();
    vi.mocked(useTransactions).mockReturnValue({ ...useTransactions(), transactions: [], loading: true });
    const result = useSupabaseTransactions();
    expect(result.transactions).toEqual([]); expect(result.loading).toBe(true);
    expect(result.getStats().monthlyRevenue).toBe(0);
  });
});
