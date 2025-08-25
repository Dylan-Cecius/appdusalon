import { Card } from '@/components/ui/card';
import { CreditCard, Banknote } from 'lucide-react';

interface PaymentStats {
  today: {
    cash: number;
    card: number;
    cashPercent: number;
    cardPercent: number;
  };
  weekly: {
    cash: number;
    card: number;
    cashPercent: number;
    cardPercent: number;
  };
  monthly: {
    cash: number;
    card: number;
    cashPercent: number;
    cardPercent: number;
  };
}

interface PaymentMethodStatsProps {
  paymentStats: PaymentStats;
}

const PaymentMethodStats = ({ paymentStats }: PaymentMethodStatsProps) => {
  const periods = [
    {
      title: 'Aujourd\'hui',
      data: paymentStats.today,
      color: 'bg-accent/10'
    },
    {
      title: 'Cette semaine',
      data: paymentStats.weekly,
      color: 'bg-primary/10'
    },
    {
      title: 'Ce mois',
      data: paymentStats.monthly,
      color: 'bg-pos-success/10'
    }
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-3 text-primary">💳 Méthodes de paiement</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {periods.map((period, index) => (
          <Card key={index} className="p-4">
            <h4 className="font-medium mb-4 text-center">{period.title}</h4>
            
            <div className="space-y-4">
              {/* Espèces */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-green-500/10 rounded">
                      <Banknote className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">Espèces</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{period.data.cash}</div>
                    <div className="text-xs text-muted-foreground">
                      {period.data.cashPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${period.data.cashPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Bancontact/Carte */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-500/10 rounded">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">Bancontact</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{period.data.card}</div>
                    <div className="text-xs text-muted-foreground">
                      {period.data.cardPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${period.data.cardPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Total */}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total transactions</span>
                  <span>{period.data.cash + period.data.card}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="p-4 bg-gradient-to-r from-card to-muted/20">
        <h4 className="font-medium mb-3">Répartition globale du mois</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {paymentStats.monthly.cashPercent.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Espèces</div>
            <div className="text-xs text-muted-foreground">
              ({paymentStats.monthly.cash} transactions)
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {paymentStats.monthly.cardPercent.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Bancontact</div>
            <div className="text-xs text-muted-foreground">
              ({paymentStats.monthly.card} transactions)
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentMethodStats;