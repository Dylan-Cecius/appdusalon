import { describe, expect, it } from 'vitest';
import type { Appointment } from '@/data/appointments';
import { agendaClientDirectory, agendaPhone, clientAgendaSummary, clientAppointmentHistory, clientFromAppointment, searchAgendaClients } from './agendaClients';

const appointment = (id: string, changes: Partial<Appointment> = {}): Appointment => ({
  id, clientName: 'Élodie Noël', clientPhone: '0471 12 34 56', services: [], staffId: 'a',
  startTime: new Date('2026-10-13T09:00:00Z'), endTime: new Date('2026-10-13T09:30:00Z'),
  status: 'scheduled', isPaid: false, totalPrice: 25, ...changes,
});
describe('agenda client identity and history', () => {
  it('matches name accents and Belgian national/international phone formats', () => {
    const a = appointment('a'), b = appointment('b', { clientName: 'ELODIE  NOEL', clientPhone: '+32 (471) 12-34-56' });
    expect(clientAppointmentHistory(clientFromAppointment(a), [a, b])).toHaveLength(2);
    expect(agendaPhone('0032 471 12 34 56')).toBe(agendaPhone('0471 12 34 56'));
  });
  it('does not mix homonyms or people sharing a household phone', () => {
    const a = appointment('a');
    const others = [appointment('b', { clientPhone: '0472 12 34 56' }), appointment('c', { clientName: 'Lucas Noël' })];
    expect(clientAppointmentHistory(clientFromAppointment(a), [a, ...others]).map(item => item.id)).toEqual(['a']);
    expect(agendaClientDirectory([a, ...others])).toHaveLength(3);
  });
  it.each(['', '***-***-****', '12'])('never groups records with an unusable phone: %s', phone => {
    const a = appointment('a', { clientPhone: phone }), b = appointment('b', { clientPhone: phone });
    expect(clientAppointmentHistory(clientFromAppointment(a), [a, b]).map(item => item.id)).toEqual(['a']);
    expect(agendaClientDirectory([a, b])).toHaveLength(2);
    expect(agendaClientDirectory([], [{ id: 'registered', name: a.clientName, phone }])).toHaveLength(1);
  });
  it('uses registered contacts for suggestions without merging or mutating their records', () => {
    const registered = [{ id: 'one', name: 'Élodie Noël', phone: '+32471123456' }, { id: 'two', name: 'Élodie Noël', phone: '+32471123456' }];
    const saved = JSON.stringify(registered);
    const contacts = agendaClientDirectory([appointment('a'), appointment('b')], registered);
    expect(contacts.map(item => item.key)).toEqual(['client:one', 'client:two']);
    expect(JSON.stringify(registered)).toBe(saved);
    expect(clientAppointmentHistory(contacts[0], [appointment('a')])).toHaveLength(1);
  });
  it('searches names without accents and numbers with spaces or prefixes', () => {
    const contacts = agendaClientDirectory([appointment('a'), appointment('b', { clientName: 'Marie', clientPhone: '+32472123456' })]);
    expect(searchAgendaClients(contacts, 'noel elodie')).toHaveLength(1);
    expect(searchAgendaClients(contacts, '+32 471 12 34 56')[0].name).toBe('Élodie Noël');
    expect(searchAgendaClients(contacts, '0472 12 34 56')[0].name).toBe('Marie');
    expect(searchAgendaClients(contacts, 'introuvable')).toEqual([]);
  });
  it('counts only completed visits and separates cancellations, absences and upcoming bookings', () => {
    const now = new Date('2026-10-13T10:00:00Z');
    const summary = clientAgendaSummary([
      appointment('done', { status: 'completed' }), appointment('scheduled-past'), appointment('absent', { status: 'no_show' }),
      appointment('cancelled', { status: 'cancelled' }), appointment('later', { startTime: new Date('2026-10-14T09:00Z'), endTime: new Date('2026-10-14T09:30Z') }),
    ], now);
    expect(summary.completed).toBe(1);
    expect(summary.upcoming.map(item => item.id)).toEqual(['later']);
    expect(summary.noShows).toBe(1); expect(summary.cancelled).toBe(1);
  });
});
