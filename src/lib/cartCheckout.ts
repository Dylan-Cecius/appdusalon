import type { NewTransaction } from './transactions';
export interface CartItem {
  id: string; name: string; price: number; duration: number; quantity: number;
  kind?: 'service' | 'product'; stock?: number;
}
export const cartTotalAmount = (items: readonly CartItem[]) => items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100;

/** Snapshot the confirmed basket. The server still validates prices, staff and stock. */
export async function createCartTransaction<T extends { id: string }>(items: readonly CartItem[], method: 'cash' | 'card', staffId: string | undefined, create: (input: NewTransaction) => Promise<T | undefined>): Promise<T> {
  if (!items.length || items.some(item => !Number.isFinite(item.price) || item.price < 0 || !Number.isInteger(item.quantity) || item.quantity < 1)) throw new Error('Panier invalide.');
  const totalAmount = cartTotalAmount(items);
  if (totalAmount <= 0) throw new Error('Le montant du panier doit être positif.');
  const result = await create({ items: items.map(item => ({ ...item })), totalAmount, paymentMethod: method, staffId: staffId === 'none' ? undefined : staffId });
  if (!result?.id) throw new Error('Enregistrement non confirmé.');
  return result;
}
