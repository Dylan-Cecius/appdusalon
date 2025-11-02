import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CreditCard, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';

const CustomPaymentStats = () => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const { transactions } = useSupabaseTransactions();
  
  const calculateStats = () => {
    if (!selectedDates || selectedDates.length === 0) return null;

    const filteredTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      txDate.setHours(0, 0, 0, 0);
      
      return selectedDates.some(selectedDate => {
        const compareDate = new Date(selectedDate);
        compareDate.setHours(0, 0, 0, 0);
        return txDate.getTime() === compareDate.getTime();
      });
    });

    const cashTx = filteredTransactions.filter(tx => tx.paymentMethod === 'cash');
    const cardTx = filteredTransactions.filter(tx => tx.paymentMethod === 'card');

    const cashAmount = cashTx.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const cardAmount = cardTx.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const totalAmount = cashAmount + cardAmount;

    const cashPercent = totalAmount > 0 ? (cashAmount / totalAmount) * 100 : 0;
    const cardPercent = totalAmount > 0 ? (cardAmount / totalAmount) * 100 : 0;

    return {
      cash: {
        count: cashTx.length,
        amount: cashAmount,
        percent: cashPercent
      },
      card: {
        count: cardTx.length,
        amount: cardAmount,
        percent: cardPercent
      },
      total: {
        count: filteredTransactions.length,
        amount: totalAmount
      }
    };
  };

  const stats = calculateStats();

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-primary">📊 Statistiques de paiement personnalisées</h3>
      
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Sélectionnez les jours</label>
        <Card className="p-4">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={(dates) => setSelectedDates(dates || [])}
            initialFocus
            className="pointer-events-auto"
            locale={fr}
          />
          {selectedDates.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                {selectedDates.length} jour{selectedDates.length > 1 ? 's' : ''} sélectionné{selectedDates.length > 1 ? 's' : ''}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDates([])}
                className="w-full"
              >
                Effacer la sélection
              </Button>
            </div>
          )}
        </Card>
      </div>

      {stats && (
        <div className="space-y-6">
          {/* Total Overview */}
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">
                {stats.total.amount.toFixed(2)}€
              </div>
              <div className="text-sm text-muted-foreground">
                Total sur la période • {stats.total.count} transactions
              </div>
            </div>
          </Card>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cash */}
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">Espèces</h4>
                  <p className="text-xs text-muted-foreground">{stats.cash.count} transactions</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-green-600">
                    {stats.cash.amount.toFixed(2)}€
                  </span>
                  <span className="text-lg font-semibold text-green-600">
                    {stats.cash.percent.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-secondary rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${stats.cash.percent}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Card */}
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">Bancontact</h4>
                  <p className="text-xs text-muted-foreground">{stats.card.count} transactions</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-blue-600">
                    {stats.card.amount.toFixed(2)}€
                  </span>
                  <span className="text-lg font-semibold text-blue-600">
                    {stats.card.percent.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-secondary rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                    style={{ width: `${stats.card.percent}%` }}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {!stats && selectedDates.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Aucune transaction trouvée pour les jours sélectionnés
        </div>
      )}

      {selectedDates.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Sélectionnez un ou plusieurs jours pour voir les statistiques
        </div>
      )}
    </Card>
  );
};

export default CustomPaymentStats;
