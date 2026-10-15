export interface RowPage<T> { data: T[] | null; count: number | null; error: unknown }
/** Detect incomplete/changing pagination; this is not a SQL transaction snapshot. */
export async function readCompleteRows<T extends { id: string }>(read: (from: number, to: number) => Promise<RowPage<T>>, current: () => boolean, pageSize = 500): Promise<T[] | null> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('invalid_page_size');
  const rows: T[] = [];
  const ids = new Set<string>();
  let count: number | null = null;
  do {
    if (!current()) return null;
    const page = await read(rows.length, rows.length + pageSize - 1);
    if (!current()) return null;
    if (page.error) throw page.error;
    if (!Array.isArray(page.data) || !Number.isInteger(page.count) || page.count! < 0) throw new Error('incomplete_read');
    if (count !== null && page.count !== count) throw new Error('snapshot_changed');
    count = page.count;
    if (!page.data.length && rows.length < count!) throw new Error('incomplete_read');
    for (const row of page.data) {
      if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error('snapshot_changed');
      ids.add(row.id); rows.push(row);
    }
    if (rows.length > count!) throw new Error('snapshot_changed');
  } while (rows.length < count!);
  return rows;
}
