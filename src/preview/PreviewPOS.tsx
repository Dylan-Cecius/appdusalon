import { useState } from 'react';
import { CreditCard, ReceiptText, Scissors, ShoppingCart, Trash2, WalletCards } from 'lucide-react';
import { previewClients, previewClientKey } from './projections';
import { previewServices } from './data';
import { usePreview } from './PreviewProvider';
import { completePreviewCheckout, previewTotalCents } from './checkout';
import type { PreviewCart, PreviewTicket } from './state';

const money = (cents: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
export default function PreviewPOS() {
  const { state, setState, setCart } = usePreview();
  const [error, setError] = useState<string | null>(null);
  const cart = state.cart;
  const contacts = previewClients(state);
  const selectedContact = contacts.find(contact => contact.id === previewClientKey(cart.clientName, cart.clientPhone));
  const lastTicket = !cart.lines.length ? state.tickets.at(-1) : undefined;
  const updateCart = (update: (current: PreviewCart) => PreviewCart) => {
    try { setCart(update); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'La saisie n’a pas pu être conservée.'); }
  };
  const confirm = (method: PreviewTicket['method']) => {
    try {
      const requestedId = cart.id;
      setState(current => completePreviewCheckout(current, requestedId, method, new Date(), crypto.randomUUID()).state);
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Le ticket n’a pas pu être confirmé.'); }
  };
  return <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
    <div><h1 className="text-3xl font-semibold">Caisse</h1><p className="mt-1 text-slate-500">Ajoutez une prestation au ticket. Tous les règlements sont simulés.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{previewServices.map(service => <button type="button" key={service.id} onClick={() => updateCart(current => {
        const lines = [...current.lines, { ...service }]; previewTotalCents(lines); return { ...current, lines };
      })} className="rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"><div className="flex justify-between gap-2"><Scissors className="text-indigo-600" /><span className="font-semibold">{money(Math.round(service.price * 100))}</span></div><p className="mt-4 font-medium">{service.name}</p><p className="text-sm text-slate-500">{service.duration} min</p></button>)}</div>
    </div>
    <section aria-label="Ticket de démonstration" className="h-fit rounded-2xl border bg-white p-5 shadow-sm lg:sticky lg:top-20">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Ticket</h2><ReceiptText className="text-slate-400" /></div>
      <div className="mt-4 space-y-3">
        <label className="block text-sm">Reprendre un contact fictif<select value={selectedContact?.id || ''} onChange={event => {
          const contact = contacts.find(item => item.id === event.target.value);
          updateCart(current => ({ ...current, clientName: contact?.name || '', clientPhone: contact?.phone || '' }));
        }} className="mt-1 w-full min-w-0 rounded-xl border bg-white p-2"><option value="">Nouveau client / sans contact</option>{contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name} · {contact.phone || 'sans téléphone'}</option>)}</select></label>
        <label className="block text-sm">Client fictif (facultatif)<input maxLength={100} value={cart.clientName} onChange={event => updateCart(current => ({ ...current, clientName: event.target.value }))} className="mt-1 w-full rounded-xl border p-2" placeholder="Nom de démonstration" /></label>
        <label className="block text-sm">Téléphone fictif (facultatif)<input maxLength={30} type="tel" value={cart.clientPhone} onChange={event => updateCart(current => ({ ...current, clientPhone: event.target.value }))} className="mt-1 w-full rounded-xl border p-2" placeholder="0000 00 00 00" /></label>
      </div>
      <div className="mt-4 min-h-32 space-y-2">{cart.lines.length === 0 ? <div className="flex h-28 flex-col items-center justify-center text-slate-400"><ShoppingCart /><p className="mt-2 text-sm">Aucune prestation</p></div> : cart.lines.map((line, index) => <div key={index} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm"><span className="min-w-0 flex-1 break-words">{line.name}</span><span className="whitespace-nowrap font-medium">{money(Math.round(line.price * 100))}</span><button type="button" aria-label={`Retirer ${line.name}, ligne ${index + 1}`} onClick={() => updateCart(current => ({ ...current, lines: current.lines.filter((_, position) => position !== index) }))} className="rounded-lg p-2 hover:bg-red-50"><Trash2 size={16} /></button></div>)}</div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {lastTicket && <div role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-medium">Ticket simulé enregistré : {money(lastTicket.totalCents)}</p><p>{lastTicket.method === 'cash' ? 'Espèces' : 'Carte'} · {lastTicket.clientName || 'Sans client associé'}</p><p>Aucun paiement réel. Retrouvez ce ticket dans les statistiques.</p></div>}
      <div className="mt-4 border-t pt-4"><div className="flex justify-between text-xl font-semibold"><span>Total</span><span>{money(previewTotalCents(cart.lines))}</span></div>
        <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" disabled={!cart.lines.length} onClick={() => confirm('cash')} className="rounded-xl bg-emerald-600 px-3 py-3 text-sm font-medium text-white disabled:opacity-40"><WalletCards className="mx-auto mb-1" size={18} />Simuler espèces</button><button type="button" disabled={!cart.lines.length} onClick={() => confirm('card')} className="rounded-xl bg-indigo-600 px-3 py-3 text-sm font-medium text-white disabled:opacity-40"><CreditCard className="mx-auto mb-1" size={18} />Simuler carte</button></div>
        {cart.lines.length > 0 && <button type="button" onClick={() => updateCart(current => ({ ...current, lines: [] }))} className="mt-2 w-full rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">Vider le ticket</button>}
      </div>
    </section>
  </div>;
}
