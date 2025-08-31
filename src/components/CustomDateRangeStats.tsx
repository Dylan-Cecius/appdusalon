import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Euro, Users, TrendingUp, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';

interface CustomStats {
  totalRevenue: number;
  totalClients: number;
  transactionRevenue: number;
  appointmentRevenue: number;
  transactions: any[];
  appointments: any[];
}

const CustomDateRangeStats = () => {
  const { transactions } = useSupabaseTransactions();
  const { appointments } = useSupabaseAppointments();
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'transactions' | 'appointments'>('all');
  const [customStats, setCustomStats] = useState<CustomStats | null>(null);

  const getCustomStats = (start: Date, end: Date): CustomStats => {
    // Filter transactions
    const filteredTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.transactionDate);
      return txDate >= start && txDate <= end;
    });

    // Filter appointments
    const filteredAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= start && aptDate <= end && apt.isPaid;
    });

    // Calculate revenues
    const transactionRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const appointmentRevenue = filteredAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0);
    
    return {
      totalRevenue: transactionRevenue + appointmentRevenue,
      totalClients: filteredTransactions.length + filteredAppointments.length,
      transactionRevenue,
      appointmentRevenue,
      transactions: filteredTransactions,
      appointments: filteredAppointments
    };
  };

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
    setFilterType('all');
    setCustomStats(null);
  };

  const getDisplayData = () => {
    if (!customStats) return null;
    
    switch (filterType) {
      case 'transactions':
        return {
          revenue: customStats.transactionRevenue,
          count: customStats.transactions.length,
          items: customStats.transactions,
          type: 'transactions'
        };
      case 'appointments':
        return {
          revenue: customStats.appointmentRevenue,
          count: customStats.appointments.length,
          items: customStats.appointments,
          type: 'appointments'
        };
      default:
        return {
          revenue: customStats.totalRevenue,
          count: customStats.totalClients,
          items: [...customStats.transactions, ...customStats.appointments],
          type: 'all'
        };
    }
  };

  const displayData = getDisplayData();

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">CA Période Personnalisée</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div>
          <Label htmlFor="filterType">Type de données</Label>
          <Select value={filterType} onValueChange={(value: 'all' | 'transactions' | 'appointments') => setFilterType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout (Ventes + RDV)</SelectItem>
              <SelectItem value="transactions">Ventes directes uniquement</SelectItem>
              <SelectItem value="appointments">Rendez-vous uniquement</SelectItem>
            </SelectContent>
          </Select>
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

      {customStats && displayData && (
        <div className="space-y-4 mt-6">
          <div className="text-center p-4 bg-primary/5 rounded-lg">
            <h4 className="font-medium text-primary mb-2">
              Période: {format(new Date(startDate), 'dd/MM/yyyy', { locale: fr })} - {format(new Date(endDate), 'dd/MM/yyyy', { locale: fr })}
            </h4>
            <p className="text-xs text-muted-foreground">
              {filterType === 'all' ? 'Ventes directes + Rendez-vous' : 
               filterType === 'transactions' ? 'Ventes directes uniquement' : 
               'Rendez-vous uniquement'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-lg bg-accent/10 text-accent-foreground">
                  <Euro className="h-6 w-6" />
                </div>
              </div>
              <p className="text-2xl font-bold text-primary mb-1">
                {displayData.revenue.toFixed(2)}€
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
                {displayData.count}
              </p>
              <p className="text-sm text-muted-foreground">
                {filterType === 'all' ? 'Total opérations' : 
                 filterType === 'transactions' ? 'Ventes' : 'Rendez-vous'}
              </p>
            </Card>

            {filterType === 'all' && (
              <Card className="p-4 text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-2 rounded-lg bg-secondary/10 text-secondary-foreground">
                    <Scissors className="h-6 w-6" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Ventes: {customStats.transactionRevenue.toFixed(2)}€</p>
                  <p className="text-sm font-medium">RDV: {customStats.appointmentRevenue.toFixed(2)}€</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Répartition</p>
              </Card>
            )}
          </div>

          {displayData.items.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium mb-3">
                Détail ({displayData.items.length} {filterType === 'appointments' ? 'rendez-vous' : filterType === 'transactions' ? 'ventes' : 'opérations'})
              </h5>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {displayData.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-muted/30 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <span>
                        {format(new Date(item.transactionDate || item.startTime), 'dd/MM à HH:mm', { locale: fr })}
                      </span>
                      {item.client_name && (
                        <span className="text-xs text-muted-foreground">- {item.client_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {(item.totalAmount || item.totalPrice).toFixed(2)}€
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.paymentMethod ? 
                          `(${item.paymentMethod === 'cash' ? 'Espèces' : 'Carte'})` : 
                          '(RDV)'
                        }
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