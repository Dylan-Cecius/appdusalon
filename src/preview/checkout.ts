import type { Service } from '@/data/services';
import { emptyPreviewCart, type PreviewState, type PreviewTicket } from './state';

export function previewTotalCents(lines: Service[]) {
  if (lines.length > 100) throw new Error('Le ticket de démonstration est limité à 100 prestations.');
  let total = 0;
  for (const line of lines) {
    const cents = Math.round(line.price * 100);
    if (!line.id || !line.name.trim() || !Number.isFinite(line.price) || line.price < 0 ||
      Math.abs(line.price * 100 - cents) > 0.000001 || !Number.isSafeInteger(cents)) {
      throw new Error('Le tarif de cette prestation est invalide.');
    }
    total += cents;
    if (!Number.isSafeInteger(total)) throw new Error('Le montant du ticket est trop élevé.');
  }
  return total;
}

// A cart ID is also its receipt ID. Replaying the same confirmation, including
// after reload, returns the original receipt without consuming the next cart.
export function completePreviewCheckout(state: PreviewState, cartId: string,
  method: PreviewTicket['method'], now: Date, nextCartId: string): { state: PreviewState; ticket: PreviewTicket } {
  const existing = state.tickets.find(ticket => ticket.id === cartId);
  if (existing) return { state, ticket: existing };
  if (state.cart.id !== cartId) throw new Error('Le ticket a changé. Vérifiez le panier avant de réessayer.');
  if (!state.cart.lines.length) throw new Error('Ajoutez une prestation au ticket.');
  if (!['cash', 'card'].includes(method) || !Number.isFinite(now.getTime()) || !nextCartId || nextCartId === cartId || state.tickets.some(ticket => ticket.id === nextCartId)) throw new Error('Confirmation de démonstration invalide.');
  const ticket: PreviewTicket = {
    id: cartId, createdAt: new Date(now), lines: state.cart.lines.map(line => ({ ...line })),
    totalCents: previewTotalCents(state.cart.lines), method,
    clientName: state.cart.clientName.trim(), clientPhone: state.cart.clientPhone.trim(),
  };
  return { state: { ...state, cart: emptyPreviewCart(nextCartId), tickets: [...state.tickets, ticket] }, ticket };
}
