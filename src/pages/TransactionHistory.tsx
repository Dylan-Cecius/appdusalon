import PaymentBreakdown, { paymentPeriodExplanation } from '@/components/PaymentBreakdown';
import { buildPaymentStats, transactionSalonDay } from '@/lib/paymentStats';
import { paymentMethodLabel } from '@/lib/transactions';
import { useMemo, useState } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ReceiptText } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import MainLayout from '@/components/MainLayout';

export default function TransactionHistory() {
  const { transactions, loading } = useTransactions();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const selectedDayTransactions = useMemo(
    () => transactions.filter(tx => transactionSalonDay(tx) === format(selectedDate, 'yyyy-MM-dd')),
    [transactions, selectedDate]
  );

  const dayStats = useMemo(() => buildPaymentStats(selectedDayTransactions), [selectedDayTransactions]);

  const transactionDates = useMemo(
    () => transactions.map(tx => startOfDay(tx.transactionDate)),
    [transactions]
  );

  const sortedTransactions = useMemo(
    () => [...selectedDayTransactions].sort(
      (a, b) => b.transactionDate.getTime() - a.transactionDate.getTime()
    ),
    [selectedDayTransactions]
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Encaissements</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Historique</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Consultez les transactions enregistrées en caisse, jour par jour.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <Card className="v2-panel h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-4 w-4 text-primary" />
                Sélectionner une date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={fr}
                className="rounded-xl border pointer-events-auto"
                modifiers={{ hasTransaction: transactionDates }}
                modifiersStyles={{
                  hasTransaction: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textDecorationColor: 'hsl(var(--primary))',
                    textDecorationThickness: '2px',
                  },
                }}
              />

              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-medium">Ventes enregistrées</h3>
                <PaymentBreakdown stats={dayStats} />
                <p className="text-xs text-muted-foreground">{paymentPeriodExplanation}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="v2-panel min-w-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ReceiptText className="h-5 w-5 text-primary" />
                {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-14">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : sortedTransactions.length === 0 ? (
                <div className="py-14 text-center">
                  <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground/35" />
                  <p className="font-medium">Aucun encaissement ce jour</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Les transactions enregistrées en caisse apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedTransactions.map(transaction => (
                    <div
                      key={transaction.id}
                      className="rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/20"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            {format(transaction.transactionDate, 'HH:mm', { locale: fr })}
                          </p>
                          <p className="mt-1 text-2xl font-semibold tracking-tight">
                            {transaction.totalAmount.toFixed(2)}€
                          </p>
                        </div>

                        <Badge variant={transaction.paymentMethod === 'cash' ? 'default' : 'secondary'}>
                          {paymentMethodLabel[transaction.paymentMethod]}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2">
                        {transaction.items.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <span className="mr-2 text-xs text-muted-foreground">{item.quantity}×</span>
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <span className="shrink-0 font-semibold">
                              {(item.price * item.quantity).toFixed(2)}€
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
