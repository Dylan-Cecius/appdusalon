import { formatInTimeZone } from 'date-fns-tz';
import type { Client, ClientStats } from './clients';
export type ClientExportRow = Client & ClientStats;

/** Bound reads, preserve input order, and never return a partial export after failure. */
export async function prepareClientExport(clients: readonly Client[], readStats: (id: string) => Promise<ClientStats>, current: () => boolean, concurrency = 4): Promise<ClientExportRow[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('invalid_export_concurrency');
  const snapshot = clients.map(client => ({ ...client }));
  const result: ClientExportRow[] = new Array(snapshot.length);
  let next = 0;
  let stopped = false;
  const assertCurrent = () => { if (stopped || !current()) throw new Error('export_context_changed'); };
  const worker = async () => {
    try {
      while (next < snapshot.length) {
        assertCurrent();
        const index = next++;
        const stats = await readStats(snapshot[index].id);
        assertCurrent();
        if (!Number.isFinite(stats.totalSpent) || stats.totalSpent < 0 || !Number.isInteger(stats.visitCount) || stats.visitCount < 0 || (stats.lastVisit !== null && !Number.isFinite(Date.parse(stats.lastVisit)))) throw new Error('invalid_export_stats');
        result[index] = { ...snapshot[index], ...stats };
      }
    } catch (error) { stopped = true; throw error; }
  };
  assertCurrent();
  await Promise.all(Array.from({ length: Math.min(concurrency, snapshot.length) }, worker));
  assertCurrent();
  return result;
}

export function clientCsvText(value: string | null | undefined): string {
  const text = value ?? '';
  // Quote all text, escape embedded quotes, and neutralize common spreadsheet formula prefixes.
  let start = 0;
  while (start < text.length && (text.charCodeAt(start) <= 32 || text.charCodeAt(start) === 0xFEFF)) start++;
  const trimmed = text.slice(start);
  const protectedText = /^[=+@-]/.test(trimmed) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${protectedText.replace(/"/g, '""')}"`;
}
const birthday = (value?: string) => {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error('invalid_export_birth_date');
  return `${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`;
};
export function buildClientExport(rows: readonly ClientExportRow[], type: 'csv' | 'json', includeNotes: boolean): string {
  const mapped = rows.map(client => ({
    nom: client.name, telephone: client.phone, email: client.email || null,
    date_naissance: birthday(client.birth_date) ? client.birth_date : null,
    date_creation: formatInTimeZone(client.created_at, 'Europe/Brussels', 'dd/MM/yyyy'),
    nombre_visites: client.visitCount, total_depense: client.totalSpent,
    ...(includeNotes ? { notes: client.notes || null } : {}),
  }));
  if (type === 'json') return JSON.stringify(mapped, null, 2);
  const header = ['Nom','Téléphone','Email','Date de naissance','Date de création','Passages enregistrés','Total dépensé (€)', ...(includeNotes ? ['Notes'] : [])].map(clientCsvText).join(',');
  return [header, ...mapped.map(client => [
    clientCsvText(client.nom), clientCsvText(client.telephone), clientCsvText(client.email), clientCsvText(birthday(client.date_naissance || undefined)), clientCsvText(client.date_creation),
    String(client.nombre_visites), client.total_depense.toFixed(2), ...(includeNotes ? [clientCsvText(client.notes)] : []),
  ].join(','))].join('\r\n');
}
