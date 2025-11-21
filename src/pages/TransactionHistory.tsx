import { useState } from 'react';
import { useTransactions } from '@/contexts/TransactionsContext';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, Banknote, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function TransactionHistory() {
  const navigate = useNavigate();
  const { transactions, loading } = useTransactions();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Filter transactions for selected date
  const selectedDayTransactions = transactions.filter(tx =>
    isSameDay(tx.transactionDate, selectedDate)
  );

  // Calculate stats for selected day
  const dayTotal = selectedDayTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
  const dayCash = selectedDayTransactions.filter(tx => tx.paymentMethod === 'cash').length;
  const dayCard = selectedDayTransactions.filter(tx => tx.paymentMethod === 'card').length;

  // Get dates with transactions for calendar highlighting
  const transactionDates = transactions.map(tx => startOfDay(tx.transactionDate));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Historique d'encaissement
            </h1>
            <p className="text-muted-foreground mt-1">
              Consultez vos transactions par date
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <Card className="lg:col-span-1 border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Calendrier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={fr}
                className="rounded-md border pointer-events-auto"
                modifiers={{
                  hasTransaction: transactionDates
                }}
                modifiersStyles={{
                  hasTransaction: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textDecorationColor: 'hsl(var(--primary))',
                    textDecorationThickness: '2px'
                  }
                }}
              />
              
              {/* Day Stats */}
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total journée</span>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {dayTotal.toFixed(2)}€
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Banknote className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-medium">Espèces</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">{dayCash}</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium">Carte</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">{dayCard}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Section */}
          <Card className="lg:col-span-2 border-border/50 shadow-lg">
            <CardHeader>
              <CardTitle>
                Agenda du {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : selectedDayTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">Aucune transaction ce jour</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {selectedDayTransactions
                    .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime())
                    .map((transaction, index) => (
                      <div
                        key={transaction.id}
                        className="relative pl-8 pb-4 border-l-2 border-primary/20 last:border-l-0"
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-lg"></div>
                        
                        {/* Transaction Card */}
                        <div className="group hover:scale-[1.02] transition-transform duration-200">
                          <Card className="border-border/50 hover:border-primary/40 hover:shadow-md transition-all duration-200">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">
                                    {format(transaction.transactionDate, 'HH:mm', { locale: fr })}
                                  </p>
                                  <p className="text-2xl font-bold text-primary">
                                    {transaction.totalAmount.toFixed(2)}€
                                  </p>
                                </div>
                                <Badge
                                  variant={transaction.paymentMethod === 'cash' ? 'default' : 'secondary'}
                                  className="flex items-center gap-1"
                                >
                                  {transaction.paymentMethod === 'cash' ? (
                                    <>
                                      <Banknote className="h-3 w-3" />
                                      Espèces
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="h-3 w-3" />
                                      Carte
                                    </>
                                  )}
                                </Badge>
                              </div>

                              {/* Items */}
                              <div className="space-y-2">
                                {transaction.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="rounded-full">
                                        {item.quantity}x
                                      </Badge>
                                      <span className="text-sm font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-semibold">
                                      {(item.price * item.quantity).toFixed(2)}€
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
