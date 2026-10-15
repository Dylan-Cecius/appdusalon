import { createRoot } from 'react-dom/client';
import { DetailedPaymentReport } from '../../src/components/DetailedPaymentReport';
import { normalizeTransaction } from '../../src/lib/transactions';
import '../../src/index.css';
const tx=normalizeTransaction({id:'t',items:[],total_amount:40,payment_method:'mixed',transaction_date:'2026-10-15T10:00:00Z',transaction_payments:[{id:'a',amount:10,method:'stripe_booking',paid_at:'2026-09-01T10:00:00Z'},{id:'b',amount:30,method:'cash',paid_at:'2026-10-15T10:00:00Z'}]});
createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-6xl p-4"><DetailedPaymentReport transactions={[tx,{...tx,id:'old',payments:undefined}]} /></main>);
