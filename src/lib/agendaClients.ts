import type { Appointment } from '@/data/appointments';

export type RegisteredAgendaClient = { id: string; name: string; phone: string };
export type AgendaClient = { key: string; name: string; phone: string; appointmentId?: string; registered: boolean };
export type BookingPrefill = { client: Pick<AgendaClient, 'name' | 'phone'>; services?: { id: string; name: string }[] };

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
export function agendaPhone(value: string): string | null {
  if (!/^[+\d\s()./-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (/^0[1-9]\d{7,8}$/.test(digits)) digits = `32${digits.slice(1)}`;
  return digits;
}

function identity(client: Pick<AgendaClient, 'name' | 'phone'>) {
  const phone = agendaPhone(client.phone), name = normalize(client.name);
  return phone && name ? `${name}|${phone}` : null;
}

export function clientFromAppointment(appointment: Appointment): AgendaClient {
  return { key: `appointment:${appointment.id}`, name: appointment.clientName, phone: appointment.clientPhone || '', appointmentId: appointment.id, registered: false };
}

export function agendaClientDirectory(appointments: Appointment[], registered: RegisteredAgendaClient[] = []): AgendaClient[] {
  const result: AgendaClient[] = registered.map(client => ({ key: `client:${client.id}`, name: client.name, phone: client.phone || '', registered: true }));
  const known = new Set(result.map(identity).filter(Boolean));
  // Most recent spelling/format is shown for appointment-only contacts.
  for (const appointment of [...appointments].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())) {
    const client = clientFromAppointment(appointment), key = identity(client);
    if (key && known.has(key)) continue;
    result.push(client);
    if (key) known.add(key);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'fr') || a.phone.localeCompare(b.phone) || a.key.localeCompare(b.key));
}

export function searchAgendaClients(clients: AgendaClient[], query: string): AgendaClient[] {
  const tokens = normalize(query).split(' ').filter(Boolean);
  const digits = query.replace(/\D/g, '');
  const phoneSearch = digits.length > 0 && /^[+\d\s()./-]+$/.test(query.trim());
  const canonicalQuery = agendaPhone(query);
  return clients.filter(client => phoneSearch
    ? client.phone.replace(/\D/g, '').includes(digits) || !!canonicalQuery && !!agendaPhone(client.phone)?.includes(canonicalQuery)
    : tokens.every(token => normalize(client.name).includes(token)));
}

export function clientAppointmentHistory(client: AgendaClient, appointments: Appointment[]): Appointment[] {
  const key = identity(client);
  return appointments.filter(appointment => key
    ? identity({ name: appointment.clientName, phone: appointment.clientPhone || '' }) === key
    : appointment.id === client.appointmentId).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export function clientAgendaSummary(history: Appointment[], now: Date) {
  const completed = history.filter(item => item.status === 'completed' && new Date(item.endTime) <= now);
  const upcoming = history.filter(item => ['scheduled', 'pending_payment'].includes(item.status) && new Date(item.endTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return { completed: completed.length, upcoming, cancelled: history.filter(item => item.status === 'cancelled').length, noShows: history.filter(item => item.status === 'no_show').length };
}
