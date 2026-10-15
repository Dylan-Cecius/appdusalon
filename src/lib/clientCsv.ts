/** Spreadsheet-oriented CSV. JSON remains the lossless export format.
 * Tab-prefix potentially interpreted text (OWASP CSV Injection guidance).
 * Spreadsheet/import behavior varies; this is not a universal formula guarantee.
 */
export function clientCsvCell(value: string | number | null | undefined): string {
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('invalid_csv_number');
  const text = value == null ? '' : String(value);
  const riskyText = typeof value === 'string' && (/^[\t\r\n]/.test(text) || /^\s*[=+\-@＝＋－＠]/u.test(text));
  return `"${(riskyText ? '\t' + text : text).replace(/"/g, '""')}"`;
}

export function clientCsvRow(values: Array<string | number | null | undefined>): string {
  return values.map(clientCsvCell).join(',');
}
