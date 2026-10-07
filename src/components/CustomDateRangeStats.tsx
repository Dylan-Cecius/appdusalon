import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Euro, Users, TrendingUp, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { usePermissions } from '@/hooks/usePermissions';

type PaymentFilter = 'all' | 'cash' | 'card';

const CustomDateRangeStats = () => {
  const { transactions } = useSupabaseTransactions();
  const { appointments } = useSupabaseAppointments();
  const { permissions } = usePermissions();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [appliedRange, setAppliedRange] = useState<{ start: Date; end: Date } | null>(null);

  const periodData = useMemo(() => {
    if (!appliedRange) return null;

    const filteredTransactions = transactions.filter(transaction => {
      const date = new Date(transaction.transactionDate);
      const matchesDate = date >= appliedRange.start && date <= appliedRange.end;
      const matchesPayment =
        paymentFilter === 'all' || transaction.paymentMethod === paymentFilter;
      return matchesDate && matchesPayment;
    });

    const filteredAppointments = appointments.filter(appointment => {
      const date = new Date(appointment.startTime);
      const belongsToViewer =
        permissions.isAdmin ||
        (permissions.employeeId && appointment.staffId === permissions.employeeId);

      return (
        belongsToViewer &&
        appointment.status !== 'cancelled' &&
        date >= appliedRange.start &&
        date <= appliedRange.end
      );
    });

    const knownClients = new Set(
      filteredTransactions.map(transaction => transaction.clientId).filter(Boolean)
    );
    const anonymousTransactions = filteredTransactions.filter(
      transaction => !transaction.clientId
    ).length;

    const revenue = filteredTransactions.reduce(
      (sum, transaction) => sum + transaction.totalAmount,
      0
    );

    return {
      revenue,
      transactionCount: filteredTransactions.length,
      appointmentCount: filteredAppointments.length,
      distinctClients: knownClients.size + anonymousTransactions,
      transactions: filteredTransactions,
    };
  }, [
    appliedRange,
    transactions,
    appointments,
    paymentFilter,
    permissions.isAdmin,
    permissions.employeeId,
  ]);

  const handleCalculate = () => {
    if (!startDate || !endDate) return;

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);

    if (start > end) return;
    setAppliedRange({ start, end });
  };

  const resetStats = () => {
    setStartDate('');
    setEndDate('');
    setPaymentFilter('all');
    setAppliedRange(null);
  };

  return (
    <Card className="v2-panel p-6 space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Période personnalisée</h3>
          <p className="text-xs text-muted-foreground">
            Le CA correspond uniquement aux encaissements réellement enregistrés en caisse.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="startDate">Date de début</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={event => setStartDate(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="endDate">Date de fin</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={event => setEndDate(event.target.value)}
            min={startDate}
          />
        </div>
        <div>
          <Label htmlFor="paymentFilter">Paiement</Label>
          <Select
            value={paymentFilter}
            onValueChange={(value: PaymentFilter) => setPaymentFilter(value)}
          >
            <SelectTrigger id="paymentFilter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les paiements</SelectItem>
              <SelectItem value="cash">Espèces</SelectItem>
              <SelectItem value="card">Bancontact / Carte</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleCalculate} disabled={!startDate || !endDate} className="flex-1">
          Calculer
        </Button>
        <Button variant="outline" onClick={resetStats} disabled={!appliedRange}>
          Réinitialiser
        </Button>
      </div>

      {periodData && appliedRange && (
        <div className="space-y-5 pt-2">
          <div className="rounded-xl bg-primary/5 p-4 text-center">
            <p className="text-sm font-medium text-primary">
              {format(appliedRange.start, 'dd/MM/yyyy', { locale: fr })} —{' '}
              {format(appliedRange.end, 'dd/MM/yyyy', { locale: fr })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="v2-kpi p-4 text-center">
              <Euro className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{periodData.revenue.toFixed(2)}€</p>
              <p className="text-xs text-muted-foreground">CA encaissé</p>
            </Card>

            <Card className="v2-kpi p-4 text-center">
              <TrendingUp className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{periodData.transactionCount}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </Card>

            <Card className="v2-kpi p-4 text-center">
              <Users className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{periodData.distinctClients}</p>
              <p className="text-xs text-muted-foreground">Clients encaissés</p>
            </Card>

            <Card className="v2-kpi p-4 text-center">
              <CalendarDays className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold">{periodData.appointmentCount}</p>
              <p className="text-xs text-muted-foreground">RDV planifiés</p>
            </Card>
          </div>

          {periodData.transactions.length > 0 && (
            <div>
              <h5 className="mb-3 font-medium">Derniers encaissements de la période</h5>
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {periodData.transactions.slice(0, 30).map(transaction => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-xl bg-muted/40 p-3 text-sm"
                  >
                    <span className="text-muted-foreground">
                      {format(new Date(transaction.transactionDate), 'dd/MM à HH:mm', { locale: fr })}
                    </span>
                    <div className="text-right">
                      <p className="font-semibold">{transaction.totalAmount.toFixed(2)}€</p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.paymentMethod === 'cash' ? 'Espèces' : 'Carte'}
                      </p>
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
