import { describe, expect, it, vi } from 'vitest';
import { runCartCheckout } from './cartCheckout';
import { insertTransactionOnce, startTransactionFollowups } from './transactionConfirmation';

describe('confirmed transaction followups', () => {
  it('clears a confirmed basket even when stock never resolves and the journal fails', async () => {
    const report = vi.fn();
    const logActivity = vi.fn(async () => { throw new Error('synthetic-log-failure'); });
    const confirmed = vi.fn();
    const record = vi.fn(async () => {
      startTransactionFollowups({ checkStock: () => new Promise(() => {}), logActivity }, report);
      return { id: 'synthetic-sale' };
    });
    await runCartCheckout({ current: false }, {
      items: [{ id: 'service', name: 'Fictif', price: 10, quantity: 1 }],
      paymentMethod: 'card', record, confirmed,
    });
    await Promise.resolve();
    expect(record).toHaveBeenCalledOnce();
    expect(confirmed).toHaveBeenCalledOnce();
    expect(logActivity).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledWith('logActivity', expect.any(Error));
  });

  it('isolates synchronous and asynchronous failures in both independent followups', async () => {
    const report = vi.fn();
    startTransactionFollowups({
      checkStock: () => { throw new Error('stock'); },
      logActivity: async () => { throw new Error('log'); },
    }, report);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(report.mock.calls.map(([name]) => name).sort()).toEqual(['checkStock', 'logActivity']);
  });

  it('contains a throwing diagnostic handler', async () => {
    const report = vi.fn(() => { throw new Error('diagnostic'); });
    startTransactionFollowups({ checkStock: async () => { throw new Error('stock'); }, logActivity: async () => {} }, report);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(report).toHaveBeenCalledOnce();
  });
});

describe('RPC/realtime transaction deduplication', () => {
  it('counts a sale once when the second source repeats its ID', () => {
    const tx = { id: 'synthetic-sale', totalAmount: 20 };
    const first = insertTransactionOnce([], tx);
    const second = insertTransactionOnce(first, { ...tx });
    expect(second).toBe(first);
    expect(second.reduce((sum, item) => sum + item.totalAmount, 0)).toBe(20);
  });
  it('preserves a newer event update when the original RPC response arrives late', () => {
    const current = [{ id: 'sale', totalAmount: 25 }];
    expect(insertTransactionOnce(current, { id: 'sale', totalAmount: 20 })).toBe(current);
    expect(insertTransactionOnce(current, { id: 'another-sale', totalAmount: 10 })).toHaveLength(2);
  });
});
