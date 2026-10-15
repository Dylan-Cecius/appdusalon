import { normalizeTransaction, type Transaction } from './transactions';
export interface TransactionPage { data: unknown[] | null; error: unknown; count: number | null }
export type TransactionPageReader = (from: number, to: number) => Promise<TransactionPage>;

/** Read every authorized row, or fail explicitly instead of reporting a truncated total. */
export async function readTransactionSnapshot(readPage: TransactionPageReader, isCurrent: () => boolean, pageSize = 500): Promise<Transaction[] | null> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('invalid_page_size');
  const transactions: Transaction[] = [];
  const ids = new Set<string>();
  let expectedCount: number | null = null;
  do {
    if (!isCurrent()) return null;
    const page = await readPage(transactions.length, transactions.length + pageSize - 1);
    if (!isCurrent()) return null;
    if (page.error) throw page.error;
    if (!Number.isInteger(page.count) || page.count! < 0 || !Array.isArray(page.data)) throw new Error('transaction_read_incomplete');
    if (expectedCount !== null && page.count !== expectedCount) throw new Error('transaction_snapshot_changed');
    expectedCount = page.count;
    if (page.data.length === 0 && transactions.length < expectedCount!) throw new Error('transaction_read_incomplete');
    for (const value of page.data) {
      const tx = normalizeTransaction(value);
      if (ids.has(tx.id)) throw new Error('transaction_snapshot_changed');
      ids.add(tx.id); transactions.push(tx);
    }
    if (transactions.length > expectedCount!) throw new Error('transaction_snapshot_changed');
  } while (transactions.length < expectedCount!);
  return transactions;
}
