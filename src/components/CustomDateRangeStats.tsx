import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Euro, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';

const CustomDateRangeStats = () => {
  const { getCustomStats } = useSupabaseTransactions();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customStats, setCustomStats] = useState<{
    totalRevenue: number;
    totalClients: number;
    transactions: any[];
  } | null>(null);

  const handleCalculate = () => {
    if (!startDate || !endDate) {
      return;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return;
    }

    const stats = getCustomStats(start, end);
    setCustomStats(stats);
  };

  const resetStats = () => {
    setStartDate('');
    setEndDate('');
    setCustomStats(null);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Calcul par période personnalisée</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Date de début</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="endDate">Date de fin</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={handleCalculate} 
          disabled={!startDate || !endDate}
          className="flex-1"
        >
          Calculer
        </Button>
        <Button 
          variant="outline" 
          onClick={resetStats}
          disabled={!customStats}
        >
          Reset
        </Button>
      </div>

      {customStats && (
        <div className="space-y-4 mt-6">
          <div className="text-center p-4 bg-primary/5 rounded-lg">
            <h4 className="font-medium text-primary mb-2">
              Période: {format(new Date(startDate), 'dd/MM/yyyy', { locale: fr })} - {format(new Date(endDate), 'dd/MM/yyyy', { locale: fr })}
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-lg bg-accent/10 text-accent-foreground">
                  <Euro className="h-6 w-6" />
                </div>
              </div>
              <p className="text-2xl font-bold text-primary mb-1">
                {customStats.totalRevenue.toFixed(2)}€
              </p>
              <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
            </Card>

            <Card className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <p className="text-2xl font-bold text-primary mb-1">
                {customStats.totalClients}
              </p>
              <p className="text-sm text-muted-foreground">Transactions</p>
            </Card>
          </div>

          {customStats.transactions.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium mb-3">Détail des transactions ({customStats.transactions.length})</h5>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {customStats.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                    <span>{format(transaction.transactionDate, 'dd/MM à HH:mm', { locale: fr })}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{transaction.totalAmount.toFixed(2)}€</span>
                      <span className="text-xs text-muted-foreground">
                        ({transaction.paymentMethod === 'cash' ? 'Espèces' : 'Carte'})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default CustomDateRangeStats;