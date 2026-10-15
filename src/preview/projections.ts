import { formatInTimeZone } from 'date-fns-tz';
import type { Service } from '@/data/services';
import { normalizeSearchText } from '@/lib/searchText';
import { buildPaymentStats } from '@/lib/paymentStats';
import type { PreviewState } from './state';

export const previewTimezone = 'Europe/Brussels';
export const previewDay = (date: Date) => formatInTimeZone(date, previewTimezone, 'yyyy-MM-dd');
export const previewDayOffset = (day: string, offset: number) => {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
export type PreviewSale = {
  id: string; date: Date; totalCents: number; method: 'cash' | 'card' | 'unknown';
  clientName: string; clientPhone: string; lines: Service[]; source: 'agenda' | 'pos';
};
export function previewSales(state: PreviewState): PreviewSale[] {
  return [
    ...state.appointments.filter(item => item.status === 'completed' &&
      item.paymentStatus !== 'refunded' && (item.isPaid || item.paymentStatus === 'paid')).map(item => ({
      id: `appointment:${item.id}`, date: item.startTime, totalCents: Math.round(item.totalPrice * 100),
      method: 'unknown' as const, clientName: item.clientName, clientPhone: item.clientPhone,
      lines: item.services, source: 'agenda' as const,
    })),
    ...state.tickets.map(item => ({ id: `ticket:${item.id}`, date: item.createdAt, totalCents: item.totalCents,
      method: item.method, clientName: item.clientName, clientPhone: item.clientPhone,
      lines: item.lines, source: 'pos' as const,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id));
}

export type PreviewClient = { id: string; name: string; phone: string; visits: number; totalCents: number };
// Demo-only contact grouping. Name + normalized phone avoids merging different
// named people sharing a phone. It is not a production client identity model.
export const previewClientKey = (name: string, phone: string) =>
  JSON.stringify([normalizeSearchText(name).replace(/\s+/g, ' '), phone.replace(/\D/g, '')]);
export function previewClients(state: PreviewState): PreviewClient[] {
  const clients = new Map<string, PreviewClient>();
  const add = (name: string, phone: string) => {
    if (!name.trim()) return;
    const id = previewClientKey(name, phone);
    if (!clients.has(id)) clients.set(id, { id, name: name.trim(), phone: phone.trim(), visits: 0, totalCents: 0 });
  };
  state.appointments.forEach(item => add(item.clientName, item.clientPhone));
  state.tickets.forEach(item => add(item.clientName, item.clientPhone));
  for (const sale of previewSales(state)) {
    const client = clients.get(previewClientKey(sale.clientName, sale.clientPhone));
    if (client) { client.visits++; client.totalCents += sale.totalCents; }
  }
  return [...clients.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export function previewMetrics(state: PreviewState, now: Date, days: number) {
  if (!Number.isInteger(days) || days < 1 || days > 366) throw new Error('Période de démonstration invalide.');
  const today = previewDay(now), firstDay = previewDayOffset(today, 1 - days);
  const sales = previewSales(state).filter(sale => {
    const day = previewDay(sale.date); return day >= firstDay && day <= today;
  });
  const totalCents = sales.reduce((sum, sale) => sum + sale.totalCents, 0);
  const daily = Array.from({ length: days }, (_, index) => ({ day: previewDayOffset(firstDay, index), totalCents: 0 }));
  const byDay = new Map(daily.map(item => [item.day, item]));
  const serviceCounts = new Map<string, { name: string; count: number }>();
  sales.forEach(sale => {
    byDay.get(previewDay(sale.date))!.totalCents += sale.totalCents;
    sale.lines.forEach(line => {
      const key = JSON.stringify([line.id, line.name]);
      const entry = serviceCounts.get(key) || { name: line.name, count: 0 };
      entry.count++; serviceCounts.set(key, entry);
    });
  });
  const appointments = state.appointments.filter(item => previewDay(item.startTime) === today && !['cancelled', 'no_show'].includes(item.status));
  const upcoming = state.appointments.filter(item => ['scheduled', 'pending_payment'].includes(item.status) && item.startTime >= now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime() || a.id.localeCompare(b.id));
  return {
    sales, totalCents, averageCents: sales.length ? Math.round(totalCents / sales.length) : 0,
    daily, appointments, upcoming,
    services: [...serviceCounts.entries()].map(([id, item]) => ({ id, ...item })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
    payments: buildPaymentStats(sales.map(sale => ({ totalAmount: sale.totalCents / 100, paymentMethod: sale.method }))),
  };
}
