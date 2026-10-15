import { describe, expect, it, vi } from 'vitest';
import { runCartCheckout, type CheckoutInput } from './cartCheckout';
const items = [{ id: 'synthetic-service', name: 'Prestation fictive', price: 12.5, quantity: 2 }];
function fixture() {
  return { lock: { current: false }, options: { items, paymentMethod: 'cash' as const, record: vi.fn(async (_input: CheckoutInput) => ({ id: 'synthetic-transaction' })), confirmed: vi.fn() } };
}
describe('cart checkout confirmation', () => {
  it('snapshots the basket and clears only after an identified result', async () => {
    const f = fixture(); await runCartCheckout(f.lock, f.options);
    expect(f.options.record).toHaveBeenCalledWith({ items, totalAmount: 25, paymentMethod: 'cash', staffId: undefined });
    expect(f.options.record.mock.calls[0][0].items).not.toBe(items);
    expect(f.options.confirmed).toHaveBeenCalledOnce(); expect(f.lock.current).toBe(false);
  });
  it('ignores a second payment-method tap before the first request finishes', async () => {
    const f = fixture(); let finish!: (value: { id: string }) => void;
    f.options.record.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const first = runCartCheckout(f.lock, f.options);
    expect(await runCartCheckout(f.lock, { ...f.options, paymentMethod: 'card' })).toBe(false);
    expect(f.options.record).toHaveBeenCalledOnce(); expect(f.options.confirmed).not.toHaveBeenCalled();
    finish({ id: 'synthetic-transaction' }); await first;
    expect(f.options.confirmed).toHaveBeenCalledOnce();
  });
  it.each([undefined, null, {}, { id: '' }])('keeps the basket when confirmation is missing %#', async result => {
    const f = fixture(); f.options.record.mockImplementation(async () => result as { id: string });
    await expect(runCartCheckout(f.lock, f.options)).rejects.toThrow('checkout_unconfirmed');
    expect(f.options.confirmed).not.toHaveBeenCalled(); expect(f.lock.current).toBe(false);
  });
  it('keeps the basket on network rejection and never retries automatically', async () => {
    const f = fixture(); f.options.record.mockRejectedValue(new Error('fixture-offline'));
    await expect(runCartCheckout(f.lock, f.options)).rejects.toThrow('fixture-offline');
    expect(f.options.confirmed).not.toHaveBeenCalled(); expect(f.options.record).toHaveBeenCalledOnce(); expect(f.lock.current).toBe(false);
  });
  it.each([{ items: [] }, { items: [{ ...items[0], quantity: 0 }] }, { items: [{ ...items[0], quantity: 1.5 }] }, { items: [{ ...items[0], price: NaN }] }])('refuses an empty or invalid basket before recording %#', async ({ items: invalid }) => {
    const f = fixture(); await expect(runCartCheckout(f.lock, { ...f.options, items: invalid })).rejects.toThrow();
    expect(f.options.record).not.toHaveBeenCalled();
  });
});
