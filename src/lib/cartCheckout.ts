import { runExclusiveAction } from './exclusiveAction';

export type CheckoutItem = { id: string; name: string; price: number; quantity: number; kind?: 'service' | 'product' };
export type CheckoutInput = { items: CheckoutItem[]; totalAmount: number; paymentMethod: 'cash' | 'card'; staffId?: string };

/** A UI lock prevents concurrent taps; it is not server-side idempotency. */
export function runCartCheckout(lock: { current: boolean }, options: {
  items: CheckoutItem[];
  paymentMethod: 'cash' | 'card';
  staffId?: string;
  record: (input: CheckoutInput) => Promise<{ id: string } | null | undefined>;
  confirmed: () => void;
}): Promise<boolean> {
  return runExclusiveAction(lock, async () => {
    if (!options.items.length || options.items.some(item => !item.id || !Number.isFinite(item.price) || item.price < 0 || !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
      throw new Error('invalid_checkout_items');
    }
    const items = options.items.map(item => ({ ...item }));
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (!Number.isFinite(totalAmount)) throw new Error('invalid_checkout_total');
    const result = await options.record({ items, totalAmount, paymentMethod: options.paymentMethod, staffId: options.staffId });
    if (!result || typeof result.id !== 'string' || !result.id.trim()) throw new Error('checkout_unconfirmed');
    options.confirmed();
  });
}
