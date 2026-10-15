/** INSERT events and RPC responses can arrive in either order. Keep newer known data. */
export function insertTransactionOnce<T extends { id: string }>(transactions: T[], incoming: T): T[] {
  return transactions.some(transaction => transaction.id === incoming.id)
    ? transactions
    : [incoming, ...transactions];
}

/** Ancillary work must neither delay nor reject an already confirmed checkout. */
export function startTransactionFollowups(tasks: {
  checkStock: () => Promise<void>;
  logActivity: () => Promise<void>;
}, reportError: (task: 'checkStock' | 'logActivity', error: unknown) => void): void {
  for (const name of ['checkStock', 'logActivity'] as const) {
    void Promise.resolve().then(tasks[name]).catch(error => {
      // A diagnostic callback is also outside the transaction's success contract.
      try { reportError(name, error); } catch { /* Do not create an unhandled rejection. */ }
    });
  }
}
