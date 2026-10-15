import { createRoot } from 'react-dom/client';
import PaymentMethodStats from '../../src/components/PaymentMethodStats';
import { buildPaymentStats } from '../../src/lib/paymentStats';
import '../../src/index.css';
const stats=buildPaymentStats([
  {totalAmount:40,paymentMethod:'mixed',payments:[{id:'a',amount:10,method:'stripe_booking',paidAt:'2026-09-01T10:00:00Z'},{id:'b',amount:30,method:'cash',paidAt:'2026-10-15T10:00:00Z'}]},
  {totalAmount:40,paymentMethod:'prepaid'},
  {totalAmount:40,paymentMethod:'mixed'},
]);
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-6xl p-4"><PaymentMethodStats paymentStats={{today:stats,weekly:stats,monthly:stats}} /></main>);
