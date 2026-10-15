export interface ClientStats {
  totalSpent: number;
  visitCount: number;
  lastVisit: string | null;
}
type QueryResult<T> = { data: T[] | null; error: unknown };

/** A failed or incomplete query is not a client with no visits/revenue. */
export function confirmedClientStatistics(
  transactions: QueryResult<{ total_amount: number | string; transaction_date: string }>,
  appointments: QueryResult<{ start_time: string }>,
): ClientStats {
  if (transactions.error || appointments.error || !transactions.data || !appointments.data) {
    throw new Error('client_statistics_unavailable');
  }
  const amounts = transactions.data.map(row => Number(row.total_amount));
  const dates = [
    ...transactions.data.map(row => new Date(row.transaction_date).getTime()),
    ...appointments.data.map(row => new Date(row.start_time).getTime()),
  ];
  if (amounts.some(value => !Number.isFinite(value)) || dates.some(value => !Number.isFinite(value))) {
    throw new Error('client_statistics_invalid');
  }
  const totalSpent = amounts.reduce((sum, amount) => sum + amount, 0);
  if (!Number.isFinite(totalSpent)) throw new Error('client_statistics_invalid');
  return {
    totalSpent,
    // Preserve the existing V2 visit-count rule; transactions alone define revenue.
    visitCount: Math.max(appointments.data.length, transactions.data.length),
    lastVisit: dates.length ? new Date(dates.reduce((latest, date) => Math.max(latest, date), -Infinity)).toISOString() : null,
  };
}
