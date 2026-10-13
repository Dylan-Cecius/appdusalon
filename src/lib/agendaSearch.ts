import type { Appointment } from '@/data/appointments';

export type AgendaSearchFilter = 'all' | 'upcoming' | 'unpaid' | 'deposit' | 'cancelled';

export const agendaSearchFilters: { value: AgendaSearchFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'upcoming', label: 'À venir' },
  { value: 'unpaid', label: 'À encaisser' },
  { value: 'deposit', label: 'Acompte payé' },
  { value: 'cancelled', label: 'Annulés / absents' },
];

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function getAppointmentState(appointment: Appointment) {
  if (appointment.status === 'cancelled') return { label: 'Annulé', tone: 'muted' } as const;
  if (appointment.status === 'no_show') return { label: 'Absent', tone: 'danger' } as const;
  if (appointment.paymentStatus === 'refunded') return { label: 'Remboursé', tone: 'muted' } as const;
  if (appointment.paymentStatus === 'expired') return { label: 'Paiement expiré', tone: 'danger' } as const;
  if (appointment.isPaid || appointment.paymentStatus === 'paid') {
    return { label: appointment.status === 'completed' ? 'Payé' : 'Prépayé', tone: 'success' } as const;
  }
  if (appointment.paymentStatus === 'deposit_paid') return { label: 'Acompte payé', tone: 'info' } as const;
  if (appointment.status === 'pending_payment' || appointment.paymentStatus === 'pending') {
    return { label: 'Paiement en attente', tone: 'info' } as const;
  }
  return { label: 'À encaisser', tone: 'warning' } as const;
}

export function searchAppointments(
  appointments: Appointment[],
  query: string,
  filter: AgendaSearchFilter,
  now: Date,
): Appointment[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  const phoneQuery = query.replace(/\D/g, '');
  const isPhoneQuery = phoneQuery.length > 0 && /^[\d\s+()./-]+$/.test(query.trim());
  const nowMs = now.getTime();

  return appointments.filter((appointment) => {
    const active = appointment.status !== 'cancelled' && appointment.status !== 'no_show';
    const settled = appointment.isPaid || appointment.paymentStatus === 'paid';
    if (filter === 'upcoming' && (!active || appointment.status === 'completed' || new Date(appointment.endTime).getTime() <= nowMs)) return false;
    if (filter === 'unpaid' && (!active || settled || ['refunded', 'expired'].includes(appointment.paymentStatus || '') || appointment.totalPrice <= 0)) return false;
    if (filter === 'deposit' && (!active || settled || appointment.paymentStatus !== 'deposit_paid')) return false;
    if (filter === 'cancelled' && active) return false;

    if (isPhoneQuery) return (appointment.clientPhone || '').replace(/\D/g, '').includes(phoneQuery);
    const haystack = normalize([appointment.clientName, appointment.clientPhone, ...(appointment.services || []).map(service => service.name)].join(' '));
    return tokens.every(token => haystack.includes(token));
  }).sort((a, b) => {
    // Nearest future appointments first, then the most recent history.
    const aTime = new Date(a.startTime).getTime();
    const bTime = new Date(b.startTime).getTime();
    const aFuture = new Date(a.endTime).getTime() > nowMs;
    const bFuture = new Date(b.endTime).getTime() > nowMs;
    if (aFuture !== bFuture) return aFuture ? -1 : 1;
    return (aFuture ? aTime - bTime : bTime - aTime) || a.id.localeCompare(b.id);
  });
}
