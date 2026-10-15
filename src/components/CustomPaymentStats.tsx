import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useTransactions } from '@/contexts/TransactionsContext';
import { buildPaymentStats, transactionSalonDay } from '@/lib/paymentStats';
import PaymentBreakdown, { paymentPeriodExplanation } from '@/components/PaymentBreakdown';

export default function CustomPaymentStats() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const { transactions } = useTransactions();
  const stats = useMemo(() => {
    const days = new Set(selectedDates.map(day => format(day, 'yyyy-MM-dd')));
    return buildPaymentStats(transactions.filter(tx => days.has(transactionSalonDay(tx))));
  }, [transactions, selectedDates]);
  return <Card className="p-4 sm:p-6">
    <h3 className="mb-3 text-lg font-semibold text-primary">Paiements sur les jours sélectionnés</h3>
    <p className="mb-4 text-sm text-muted-foreground">{paymentPeriodExplanation}</p>
    <Calendar mode="multiple" selected={selectedDates} onSelect={dates => setSelectedDates(dates || [])} locale={fr} weekStartsOn={1} className="pointer-events-auto" />
    {selectedDates.length ? <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3"><p className="text-sm">{selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''} sélectionné{selectedDates.length > 1 ? 's' : ''}</p><Button variant="outline" size="sm" onClick={() => setSelectedDates([])}>Effacer la sélection</Button></div>
      {stats.transactionCount ? <PaymentBreakdown stats={stats} /> : <p className="text-sm text-muted-foreground">Aucune vente enregistrée pour les jours sélectionnés.</p>}
    </div> : <p className="mt-4 text-sm text-muted-foreground">Sélectionnez un ou plusieurs jours pour voir la répartition.</p>}
  </Card>;
}
