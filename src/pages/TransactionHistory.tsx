import { useMemo, useState } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Banknote, TrendingUp, Calendar as CalendarIcon, ReceiptText } from 'lucide-react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import MainLayout from '@/components/MainLayout';

export default function TransactionHistory() {
  const { transactions, loading } = useTransactions();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const selectedDayTransactions = useMemo(
    () => transactions.filter(tx => isSameDay(tx.transactionDate, selectedDate)),
    [transactions, selectedDate]
  );

  const dayStats = useMemo(() => {
    const cash = selectedDayTransactions.filter(tx => tx.paymentMethod === 'cash');
    const card = selectedDayTransactions.filter(tx => tx.paymentMethod === 'card');

    return {
      total: selectedDayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0),
      cashCount: cash.length,
      cardCount: card.length,
      cashAmount: cash.reduce((sum, tx) => sum + tx.totalAmount, 0),
      cardAmount: card.reduce((sum, tx) => sum + tx.totalAmount, 0),
    };
  }, [selectedDayTransactions]);

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
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CA encaissé</span>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                    {dayStats.total.toFixed(2)}€
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border bg-card p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">Espèces</span>
                    </div>
                    <p className="text-lg font-semibold">{dayStats.cashAmount.toFixed(2)}€</p>
                    <p className="text-[11px] text-muted-foreground">
                      {dayStats.cashCount} transaction{dayStats.cashCount > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-card p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">Carte</span>
                    </div>
                    <p className="text-lg font-semibold">{dayStats.cardAmount.toFixed(2)}€</p>
                    <p className="text-[11px] text-muted-foreground">
                      {dayStats.cardCount} transaction{dayStats.cardCount > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
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
                          {transaction.paymentMethod === 'cash' ? (
                            <><Banknote className="mr-1 h-3 w-3" />Espèces</>
                          ) : (
                            <><CreditCard className="mr-1 h-3 w-3" />Carte</>
                          )}
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
