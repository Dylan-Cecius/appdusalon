import type { PaymentStats } from '@/lib/paymentStats';
const amountFormat = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' });
const categories = [
  { key: 'cash', label: 'Espèces', color: 'bg-emerald-200' },
  { key: 'card', label: 'Carte', color: 'bg-sky-200' },
  { key: 'prepaid', label: 'Acomptes / prépaiements', color: 'bg-violet-200' },
  { key: 'unallocated', label: 'Répartition non renseignée', color: 'bg-amber-200' },
] as const;

export default function PaymentBreakdown({ stats }: { stats: PaymentStats }) {
  return <div className="space-y-4">
    <dl className="space-y-3">
      {categories.map(({ key, label, color }) => <div key={key}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
          <dt>{label}</dt><dd className="font-semibold tabular-nums">{amountFormat.format(stats[`${key}Amount`])}</dd>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{stats[key]} vente{stats[key] > 1 ? 's' : ''} concernée{stats[key] > 1 ? 's' : ''} · {stats[`${key}Percent`].toFixed(1)} % du montant</p>
        <div aria-hidden="true" className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full ${color}`} style={{ width: `${stats[`${key}Percent`]}%` }} /></div>
      </div>)}
    </dl>
    <div className="flex flex-wrap justify-between gap-2 border-t pt-3 text-sm font-medium"><span>{stats.transactionCount} vente{stats.transactionCount > 1 ? 's' : ''}</span><span>{amountFormat.format(stats.totalAmount)}</span></div>
    {stats.unallocatedAmount > 0 && <p className="text-xs text-amber-800 dark:text-amber-200">Certains détails de paiement sont absents ou incohérents. Ces montants restent inclus dans le total.</p>}
  </div>;
}
export const paymentPeriodExplanation = 'Répartition du montant des ventes enregistrées sur la période. Les acomptes et prépaiements peuvent avoir été reçus auparavant ; ils ne constituent pas un nouvel encaissement. Une vente mixte apparaît dans plusieurs catégories, mais une seule fois dans le total.';
