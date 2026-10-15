import { useRef, useState } from 'react';
import CartPanel, { type CartItem } from '@/components/CartPanel';
import MobileCartDrawer from '@/components/MobileCartDrawer';
import { Button } from '@/components/ui/button';
import { runCartCheckout } from '@/lib/cartCheckout';

const initialItems: CartItem[] = Array.from({ length: 12 }, (_, index) => ({
  id: `synthetic-${index}`, name: `Prestation fictive ${index + 1} avec un intitulé long`,
  price: 10 + index, quantity: 1, duration: 30, kind: 'service',
}));
const staff = [{ id: 'synthetic-staff', name: 'Équipe fictive', role: 'Coiffure', color: '#c7d2fe' }];

/** Offline fixture for the actual cart components; no backend or native bridge imports. */
export default function MobileCartDemo() {
  const [open, setOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>();
  const [items, setItems] = useState(initialItems);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const lock = useRef(false);
  const shouldFail = new URLSearchParams(location.search).get('failure') === '1';
  const checkout = async (paymentMethod: 'cash' | 'card', staffId?: string) => {
    if (lock.current) return;
    setProcessing(true); setError(null);
    try {
      await runCartCheckout(lock, {
        items, paymentMethod, staffId,
        record: async () => {
          if (shouldFail) throw new Error('synthetic-offline');
          return { id: 'synthetic-confirmed' };
        },
        confirmed: () => { setItems([]); setOpen(false); setConfirmed(true); },
      });
    } catch { setError('Échec simulé. Le panier est conservé.'); }
    finally { setProcessing(false); }
  };
  return <main className="app-safe-shell bg-slate-50">
    <div className="p-4">
      <h1 className="text-2xl font-semibold">Démonstration du panier mobile</h1>
      <p className="my-4">Données fictives, sans connexion. Les enregistrements sont simulés.</p>
      <Button className="min-h-11" onClick={() => setOpen(true)}>Ouvrir le panier fictif</Button>
      {confirmed && <p role="status" className="mt-4">Enregistrement fictif confirmé.</p>}
    </div>
    <MobileCartDrawer open={open} processing={processing} onOpenChange={next => { if (!lock.current) setOpen(next); }}>
      <CartPanel selectedStaffId={selectedStaffId} onStaffChange={setSelectedStaffId} items={items} activeStaff={staff} processing={processing} error={error}
        onCheckout={checkout}
        onRemoveItem={id => { if (!lock.current) setItems(current => current.filter(item => item.id !== id)); }}
        onUpdateQuantity={(id, quantity) => { if (!lock.current) setItems(current => quantity < 1 ? current.filter(item => item.id !== id) : current.map(item => item.id === id ? { ...item, quantity } : item)); }}
      />
    </MobileCartDrawer>
  </main>;
}
