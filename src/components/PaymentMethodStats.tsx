import { Card } from '@/components/ui/card';
import PaymentBreakdown, { paymentPeriodExplanation } from '@/components/PaymentBreakdown';
import type { PaymentStats } from '@/lib/paymentStats';

export default function PaymentMethodStats({ paymentStats }: { paymentStats: { today: PaymentStats; weekly: PaymentStats; monthly: PaymentStats } }) {
  const periods = [{ title: 'Aujourd’hui', data: paymentStats.today }, { title: 'Cette semaine', data: paymentStats.weekly }, { title: 'Ce mois', data: paymentStats.monthly }];
  return <section className="space-y-4" aria-label="Répartition des paiements">
    <h3 className="text-lg font-semibold text-primary">Répartition des paiements</h3>
    <p className="text-sm text-muted-foreground">{paymentPeriodExplanation}</p>
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">{periods.map(period => <Card key={period.title} className="min-w-0 p-4"><h4 className="mb-4 text-center font-medium">{period.title}</h4><PaymentBreakdown stats={period.data} /></Card>)}</div>
  </section>;
}
