import { describe, expect, it } from 'vitest';
import { previewClients, previewDay, previewDayOffset, previewMetrics, previewSales } from './projections';
import { completePreviewCheckout } from './checkout';
import { seedPreviewState } from './state';
import { previewServices } from './data';

const now = new Date('2026-10-15T12:00:00Z');
const empty = () => ({ ...seedPreviewState(), appointments: [], waitlist: [], tickets: [] });
function withSales() {
  const state = empty();
  state.appointments = [
    { ...seedPreviewState().appointments[0], id: 'done', startTime: now, endTime: new Date(now.getTime() + 1800000), status: 'completed', paymentStatus: 'paid', isPaid: true, totalPrice: 25, amountPaid: 25 },
  ];
  state.cart.lines = [previewServices[1]];
  return completePreviewCheckout(state, state.cart.id, 'card', now, 'next').state;
}
describe('shared demo projections', () => {
  it('has no invented revenue or percentages for an empty demonstration', () => {
    const metrics = previewMetrics(empty(), now, 7);
    expect(metrics.totalCents).toBe(0); expect(metrics.averageCents).toBe(0);
    expect(metrics.daily).toHaveLength(7); expect(metrics.payments.cardPercent).toBe(0);
  });
  it('combines completed appointments and direct receipts once, without adding deposits', () => {
    const state = withSales(); state.appointments[0].depositRequired = 10;
    const metrics = previewMetrics(state, now, 1);
    expect(metrics.totalCents).toBe(6000); expect(metrics.sales).toHaveLength(2);
    expect(metrics.averageCents).toBe(3000); expect(metrics.payments.cardAmount).toBe(35);
    expect(metrics.payments.unallocatedAmount).toBe(25); expect(metrics.payments.totalAmount).toBe(60);
  });
  it.each(['scheduled', 'pending_payment', 'cancelled', 'no_show'] as const)('does not count %s appointments as a sale', status => {
    const state = withSales(); state.appointments[0].status = status;
    expect(previewSales(state).map(item => item.source)).toEqual(['pos']);
  });
  it('excludes refunded and unpaid completed appointments', () => {
    const state = withSales(); state.appointments[0].paymentStatus = 'refunded';
    expect(previewSales(state)).toHaveLength(1);
    state.appointments[0].paymentStatus = 'unpaid'; state.appointments[0].isPaid = false;
    expect(previewSales(state)).toHaveLength(1);
  });
  it('uses Brussels calendar days across UTC midnight and daylight-saving changes', () => {
    expect(previewDay(new Date('2026-10-14T22:30:00Z'))).toBe('2026-10-15');
    expect(previewDayOffset('2026-10-26', -2)).toBe('2026-10-24');
    const state = withSales(); state.tickets[0].createdAt = new Date('2026-10-14T22:30:00Z');
    expect(previewMetrics(state, now, 1).totalCents).toBe(6000);
    state.tickets[0].createdAt = new Date('2026-10-15T22:00:00Z');
    expect(previewMetrics(state, now, 1).totalCents).toBe(2500);
  });
  it('includes only the selected civil period and keeps zero days', () => {
    const state = withSales(); state.tickets[0].createdAt = new Date('2026-10-08T12:00:00Z');
    const metrics = previewMetrics(state, now, 7);
    expect(metrics.sales).toHaveLength(1); expect(metrics.daily[0].day).toBe('2026-10-09');
    expect(metrics.daily.at(-1)?.totalCents).toBe(2500);
  });
  it('groups only matching named demo contacts and counts confirmed visits', () => {
    const state = withSales(); const source = state.appointments[0];
    state.tickets[0].clientName = source.clientName.toUpperCase(); state.tickets[0].clientPhone = source.clientPhone.replace(/ /g, '');
    state.appointments.push({ ...source, id: 'other', clientName: 'Autre personne', status: 'scheduled' });
    const clients = previewClients(state);
    expect(clients).toHaveLength(2);
    expect(clients.find(item => item.name === source.clientName)).toMatchObject({ visits: 2, totalCents: 6000 });
    expect(clients.find(item => item.name === 'Autre personne')?.visits).toBe(0);
  });
  it('does not create a fake contact for an anonymous receipt', () => {
    expect(previewClients(withSales())).toHaveLength(1);
  });
  it('sorts upcoming appointments and excludes terminal or past records', () => {
    const state = withSales(); const base = state.appointments[0];
    state.appointments.push(...[3, 1, 2].map(hour => ({ ...base, id: String(hour), status: 'scheduled' as const, startTime: new Date(now.getTime() + hour * 3600000) })));
    state.appointments[3].status = 'cancelled';
    expect(previewMetrics(state, now, 1).upcoming.map(item => item.id)).toEqual(['1', '3']);
  });
  it('counts saved service lines without substituting current catalogue prices', () => {
    const state = withSales(); state.tickets[0].lines.push({ ...previewServices[1], name: 'Ancien libellé', price: 10 });
    expect(previewMetrics(state, now, 1).services.map(item => item.name)).toContain('Ancien libellé');
  });
  it('rejects invalid period lengths', () => expect(() => previewMetrics(empty(), now, 0)).toThrow());
});
