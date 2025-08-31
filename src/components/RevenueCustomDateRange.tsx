import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { toast } from '@/components/ui/use-toast';

const RevenueCustomDateRange = () => {
  const { transactions } = useSupabaseTransactions();
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [revenue, setRevenue] = useState<number | null>(null);
  const [transactionCount, setTransactionCount] = useState<number>(0);

  const calculateRevenue = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date de début et de fin",
        variant: "destructive"
      });
      return;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      toast({
        title: "Erreur",
        description: "La date de début doit être antérieure à la date de fin",
        variant: "destructive"
      });
      return;
    }

    // Filtrer les transactions dans la période
    const filteredTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= start && txDate <= end;
    });

    const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    setRevenue(totalRevenue);
    setTransactionCount(filteredTransactions.length);

    toast({
      title: "Succès",
      description: `Chiffre d'affaires calculé pour ${filteredTransactions.length} transactions`
    });
  };

  const reset = () => {
    setStartDate('');
    setEndDate('');
    setRevenue(null);
    setTransactionCount(0);
  };

  return (
    <Card className="p-6 space-y-4">
      <CardHeader className="p-0">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle>CA Période Personnalisée</CardTitle>
        </div>
        <CardDescription>
          Calculer le chiffre d'affaires pour une période spécifique
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="revenueStartDate">Date de début</Label>
            <Input
              id="revenueStartDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="revenueEndDate">Date de fin</Label>
            <Input
              id="revenueEndDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={calculateRevenue} className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Calculer CA
          </Button>
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>

        {revenue !== null && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <div className="text-3xl font-bold text-primary">
                  {revenue.toFixed(2)}€
                </div>
                <div className="text-sm text-muted-foreground">
                  Chiffre d'affaires total
                </div>
                <div className="text-sm text-muted-foreground">
                  {transactionCount} transaction{transactionCount > 1 ? 's' : ''}
                </div>
                {startDate && endDate && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {revenue === null && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2" />
                <p className="text-sm">Sélectionnez une période pour voir le CA</p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueCustomDateRange;