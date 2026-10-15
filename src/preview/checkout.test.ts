import { describe, expect, it } from 'vitest';
import { completePreviewCheckout, previewTotalCents } from './checkout';
import { createPreviewSession, decodePreviewState, seedPreviewState } from './state';
import { previewServices } from './data';

const date = new Date('2026-10-15T12:30:00Z');
const ready = () => {
  const state = seedPreviewState();
  state.cart = { id: 'cart-1', lines: [previewServices[0], previewServices[1]], clientName: ' Élodie Démo ', clientPhone: ' 0000 ' };
  return state;
};
describe('local simulated checkout', () => {
  it('creates one saved snapshot and clears only the cart', () => {
    const state = ready(); const result = completePreviewCheckout(state, 'cart-1', 'cash', date, 'cart-2');
    expect(result.ticket).toMatchObject({ id: 'cart-1', totalCents: 6000, clientName: 'Élodie Démo', clientPhone: '0000', method: 'cash' });
    expect(result.state.cart).toEqual({ id: 'cart-2', lines: [], clientName: '', clientPhone: '' });
    expect(result.state.appointments).toBe(state.appointments); expect(state.tickets).toHaveLength(0);
    expect(result.ticket.lines[0]).not.toBe(state.cart.lines[0]);
  });
  it('is idempotent across reload and never clears a later cart', () => {
    const initial = ready(); const first = completePreviewCheckout(initial, 'cart-1', 'cash', date, 'cart-2');
    const restored = decodePreviewState(JSON.stringify(first.state), seedPreviewState());
    restored.cart.lines = [previewServices[2]];
    const replay = completePreviewCheckout(restored, 'cart-1', 'card', date, 'cart-3');
    expect(replay.state).toBe(restored); expect(replay.ticket.method).toBe('cash');
    expect(replay.state.tickets).toHaveLength(1); expect(replay.state.cart.lines).toHaveLength(1);
  });
  it('rejects an obsolete cart ID and an empty cart', () => {
    expect(() => completePreviewCheckout(ready(), 'old', 'cash', date, 'next')).toThrow(/changé/);
    const state = ready(); state.cart.lines = [];
    expect(() => completePreviewCheckout(state, 'cart-1', 'cash', date, 'next')).toThrow(/Ajoutez/);
  });
  it('keeps the full draft on failed persistence and can retry once', () => {
    const seed = ready(); let raw: string | null = null; let fail = true;
    const session = createPreviewSession({ getItem: () => raw, setItem: (_key, value) => { if (fail) throw Error('quota'); raw = value; } }, 'k', seed);
    const next = completePreviewCheckout(session.getState(), 'cart-1', 'card', date, 'next');
    expect(() => session.commit(next.state)).toThrow(); expect(session.getState()).toBe(seed);
    fail = false; session.commit(next.state);
    expect(session.getState().tickets).toHaveLength(1); expect(session.getState().cart.lines).toHaveLength(0);
  });
  it('sums in cents including decimal prices and free services', () => {
    expect(previewTotalCents([0.1, 0.2, 0].map(price => ({ ...previewServices[0], price })))).toBe(30);
  });
  it.each([-1, NaN, Infinity, 1.234, Number.MAX_SAFE_INTEGER])('rejects invalid price %s', price => {
    expect(() => previewTotalCents([{ ...previewServices[0], price }])).toThrow();
  });
  it('bounds ticket size', () => expect(() => previewTotalCents(Array(101).fill(previewServices[0]))).toThrow(/100/));
  it('rejects malformed stored cart prices and oversize carts before rendering', () => {
    const state = ready(); state.cart.lines[0] = { ...state.cart.lines[0], price: 1.234 };
    expect(() => decodePreviewState(JSON.stringify(state), seedPreviewState())).toThrow();
    state.cart.lines = Array(101).fill(previewServices[0]);
    expect(() => decodePreviewState(JSON.stringify(state), seedPreviewState())).toThrow();
  });
  it('rejects malformed stored receipts instead of displaying unreconciled totals', () => {
    const state = completePreviewCheckout(ready(), 'cart-1', 'card', date, 'next').state;
    state.tickets[0].totalCents = 1;
    expect(() => decodePreviewState(JSON.stringify(state), seedPreviewState())).toThrow();
  });
  it('rejects an invalid confirmation timestamp or reused next identity', () => {
    expect(() => completePreviewCheckout(ready(), 'cart-1', 'cash', new Date(NaN), 'next')).toThrow();
    expect(() => completePreviewCheckout(ready(), 'cart-1', 'cash', date, 'cart-1')).toThrow();
  });
});
