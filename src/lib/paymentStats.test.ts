import { describe, expect, it } from 'vitest';
import { buildCombinedStats, buildPaymentStats, transactionSalonDay, type DatedTransaction, type PaymentTransaction, type TransactionPayment } from './paymentStats';
const part = (id: string, method: string, amount: number): TransactionPayment => ({ id, method, amount, paidAt: '2026-09-01T10:00:00Z' });
const tx = (paymentMethod: PaymentTransaction['paymentMethod'], payments?: TransactionPayment[], totalAmount = 40): PaymentTransaction => ({ paymentMethod, payments, totalAmount });
const dated = (instant: string, amount = 40): DatedTransaction => ({ ...tx('cash', undefined, amount), transactionDate: new Date(instant), transactionInstant: instant });

describe('funding of recorded sales', () => {
  it('accounts once for cash, card, two deposit balances and prepaid sales', () => {
    const stats = buildPaymentStats([tx('cash'), tx('card'), tx('mixed', [part('a','stripe_booking',10),part('b','cash',30)]), tx('mixed',[part('c','stripe_booking',10),part('d','card',30)]),tx('prepaid',[part('e','stripe_booking',40)])]);
    expect(stats).toMatchObject({ cash:2,card:2,prepaid:3,transactionCount:5,totalAmount:200,cashAmount:70,cardAmount:70,prepaidAmount:60,unallocatedAmount:0,cashPercent:35,cardPercent:35,prepaidPercent:30 });
  });
  it('does not invent the method of an old mixed transaction', () => {
    expect(buildPaymentStats([tx('mixed')])).toMatchObject({ unallocatedAmount:40,unallocated:1,cashAmount:0,cardAmount:0,unallocatedPercent:100 });
  });
  it('retains known prepayment without presenting it as a new card payment', () => {
    expect(buildPaymentStats([tx('prepaid')])).toMatchObject({ prepaidAmount:40,cardAmount:0 });
  });
  it('shows the missing remainder when details are incomplete', () => {
    expect(buildPaymentStats([tx('mixed',[part('a','stripe_booking',10)])])).toMatchObject({prepaidAmount:10,unallocatedAmount:30});
  });
  it.each([
    [part('a','cash',50)], [part('a','cash',20),part('a','card',20)],
    [part('a','other',40)], [part('a','cash',-1)], [part('a','cash',NaN)],
  ])('does not trust inconsistent allocations: %j', (...payments) => {
    expect(buildPaymentStats([tx('mixed',payments)])).toMatchObject({unallocatedAmount:40,cashAmount:0,cardAmount:0});
  });
  it('uses integer cents and excludes removed transactions from the supplied snapshot', () => {
    const a=tx('cash',undefined,0.1), b=tx('card',undefined,0.2);
    expect(buildPaymentStats([a,b]).totalAmount).toBe(0.3);
    expect(buildPaymentStats([b]).totalAmount).toBe(0.2);
    expect(buildPaymentStats([])).toMatchObject({transactionCount:0,totalAmount:0,cashPercent:0});
  });
  it('rejects invalid sale amounts', () => expect(() => buildPaymentStats([tx('cash',undefined,NaN)])).toThrow('invalid_transaction_amount'));
});

describe('salon calendar periods', () => {
  it('assigns midnight to Brussels independently of browser timezone', () => {
    expect(transactionSalonDay(dated('2026-10-14T22:30:00Z'))).toBe('2026-10-15');
    const stats=buildCombinedStats([dated('2026-10-14T22:30:00Z'),dated('2026-10-14T21:59:59Z'),dated('2026-10-15T22:00:00Z')],new Date('2026-10-15T12:00:00Z'));
    expect(stats.todayRevenue).toBe(40); expect(stats.weeklyRevenue).toBe(80);
  });
  it('keeps both occurrences of the repeated autumn hour on the same day', () => {
    const stats=buildCombinedStats([dated('2026-10-25T00:30:00Z'),dated('2026-10-25T01:30:00Z')],new Date('2026-10-25T12:00:00Z'));
    expect(stats.todayRevenue).toBe(80);
  });
  it('uses Monday and handles previous month/year boundaries', () => {
    const stats=buildCombinedStats([dated('2025-12-31T12:00:00Z'),dated('2026-01-01T12:00:00Z'),dated('2026-02-01T12:00:00Z')],new Date('2026-01-01T13:00:00Z'));
    expect(stats).toMatchObject({previousMonthRevenue:40,monthlyRevenue:40,weeklyRevenue:80});
  });
  it('counts a known client once and anonymous sales separately', () => {
    const sale=dated('2026-10-15T10:00:00Z');
    expect(buildCombinedStats([{...sale,clientId:'one'},{...sale,clientId:'one'},sale],new Date('2026-10-15T12:00:00Z')).todayClients).toBe(2);
  });
});
