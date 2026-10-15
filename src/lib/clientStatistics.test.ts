import { describe, expect, it } from 'vitest';
import { confirmedClientStatistics } from './clientStatistics';
const empty = { data: [], error: null };
const transactions = { data: [{ total_amount: '12.50', transaction_date: '2026-10-14T10:00:00Z' }], error: null };
describe('client statistics confirmation', () => {
  it('returns zero only for two successful empty queries', () => {
    expect(confirmedClientStatistics(empty, empty)).toEqual({ totalSpent: 0, visitCount: 0, lastVisit: null });
  });
  it.each(['transactions', 'appointments'])('rejects returned %s query errors', source => {
    const failed = { data: [], error: { message: 'synthetic denied' } };
    expect(() => confirmedClientStatistics(source === 'transactions' ? failed : transactions, source === 'appointments' ? failed : empty)).toThrow('unavailable');
  });
  it.each(['transactions', 'appointments'])('rejects missing %s query data', source => {
    const missing = { data: null, error: null };
    expect(() => confirmedClientStatistics(source === 'transactions' ? missing : transactions, source === 'appointments' ? missing : empty)).toThrow('unavailable');
  });
  it('keeps POS revenue canonical and preserves visit/date rules', () => {
    expect(confirmedClientStatistics(transactions, { data: [{ start_time: '2026-10-15T09:00:00Z' }, { start_time: '2026-10-13T09:00:00Z' }], error: null })).toEqual({ totalSpent: 12.5, visitCount: 2, lastVisit: '2026-10-15T09:00:00.000Z' });
  });
  it('does not export invalid amounts or dates as valid statistics', () => {
    expect(() => confirmedClientStatistics({ data: [{ ...transactions.data[0], total_amount: 'invalid' }], error: null }, empty)).toThrow('invalid');
    expect(() => confirmedClientStatistics(transactions, { data: [{ start_time: 'invalid' }], error: null })).toThrow('invalid');
  });
});
