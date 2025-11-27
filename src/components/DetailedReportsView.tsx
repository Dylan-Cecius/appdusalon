import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Euro, Users, TrendingUp } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';
type PaymentFilter = 'all' | 'cash' | 'card';

interface DailyData {
  date: Date;
  transactions: number;
  cashAmount: number;
  cardAmount: number;
  totalAmount: number;
}

const DetailedReportsView = () => {
  const { transactions } = useSupabaseTransactions();
  const { appointments } = useSupabaseAppointments();
  
  const [periodType, setPeriodType] = useState<PeriodType>('daily');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Calculate date range based on period type
  const dateRange = useMemo(() => {
    const refDate = new Date(selectedDate);
    
    switch (periodType) {
      case 'daily':
        return {
          start: startOfDay(refDate),
          end: endOfDay(refDate)
        };
      case 'weekly':
        return {
          start: startOfWeek(refDate, { weekStartsOn: 1 }),
          end: endOfWeek(refDate, { weekStartsOn: 1 })
        };
      case 'monthly':
        return {
          start: startOfMonth(refDate),
          end: endOfMonth(refDate)
        };
      case 'custom':
        return {
          start: startOfDay(new Date(startDate)),
          end: endOfDay(new Date(endDate))
        };
    }
  }, [periodType, selectedDate, startDate, endDate]);

  // Calculate daily breakdown
  const dailyBreakdown = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      // Filter transactions for this day
      const dayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.transactionDate);
        return txDate >= dayStart && txDate <= dayEnd;
      });
      
      // Filter appointments for this day
      const dayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.startTime);
        return aptDate >= dayStart && aptDate <= dayEnd && apt.isPaid;
      });
      
      // Apply payment filter
      const filteredTransactions = paymentFilter === 'all' 
        ? dayTransactions 
        : dayTransactions.filter(tx => tx.paymentMethod === paymentFilter);
      
      const cashAmount = filteredTransactions
        .filter(tx => tx.paymentMethod === 'cash')
        .reduce((sum, tx) => sum + tx.totalAmount, 0);
        
      const cardAmount = filteredTransactions
        .filter(tx => tx.paymentMethod === 'card')
        .reduce((sum, tx) => sum + tx.totalAmount, 0);
      
      // Add appointments revenue (they don't have payment method in data)
      const appointmentAmount = paymentFilter === 'all' 
        ? dayAppointments.reduce((sum, apt) => sum + Number(apt.totalPrice), 0)
        : 0;
      
      return {
        date: day,
        transactions: filteredTransactions.length + (paymentFilter === 'all' ? dayAppointments.length : 0),
        cashAmount,
        cardAmount,
        totalAmount: cashAmount + cardAmount + appointmentAmount
      };
    });
  }, [dateRange, transactions, appointments, paymentFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return dailyBreakdown.reduce((acc, day) => ({
      transactions: acc.transactions + day.transactions,
      cashAmount: acc.cashAmount + day.cashAmount,
      cardAmount: acc.cardAmount + day.cardAmount,
      totalAmount: acc.totalAmount + day.totalAmount
    }), { transactions: 0, cashAmount: 0, cardAmount: 0, totalAmount: 0 });
  }, [dailyBreakdown]);

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Rapports Détaillés</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Period Type */}
          <div>
            <Label htmlFor="periodType">Période</Label>
            <Select value={periodType} onValueChange={(value: PeriodType) => setPeriodType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="daily">Journalier</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuel</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Selector for daily/weekly/monthly */}
          {periodType !== 'custom' && (
            <div>
              <Label htmlFor="selectedDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date de référence
              </Label>
              <Input
                id="selectedDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          {/* Custom Date Range */}
          {periodType === 'custom' && (
            <>
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
            </>
          )}

          {/* Payment Filter */}
          <div>
            <Label className="mb-3 block">Moyen de paiement</Label>
            <RadioGroup 
              value={paymentFilter} 
              onValueChange={(value: PaymentFilter) => {
                setPaymentFilter(value);
              }} 
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all-detailed" />
                <Label htmlFor="all-detailed" className="cursor-pointer">Tous</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash-detailed" />
                <Label htmlFor="cash-detailed" className="cursor-pointer">Cash</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card-detailed" />
                <Label htmlFor="card-detailed" className="cursor-pointer">Bancontact</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-lg bg-accent/10 text-accent-foreground">
              <Euro className="h-8 w-8" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary mb-2">
            {totals.totalAmount.toFixed(2)}€
          </p>
          <p className="text-sm text-muted-foreground">Chiffre d'Affaires Total</p>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
              <Users className="h-8 w-8" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary mb-2">
            {totals.transactions}
          </p>
          <p className="text-sm text-muted-foreground">Total Transactions</p>
        </Card>

        {paymentFilter === 'all' && (
          <Card className="p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-lg bg-secondary/10 text-secondary-foreground">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-primary">
                Cash: {totals.cashAmount.toFixed(2)}€
              </p>
              <p className="text-lg font-semibold text-primary">
                Bancontact: {totals.cardAmount.toFixed(2)}€
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Répartition Paiements</p>
          </Card>
        )}
      </div>

      {/* Daily Breakdown Table */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4">
          Détail Jour par Jour
          <span className="text-sm text-muted-foreground ml-2">
            ({format(dateRange.start, 'dd/MM/yyyy', { locale: fr })} - {format(dateRange.end, 'dd/MM/yyyy', { locale: fr })})
          </span>
        </h4>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Transactions</TableHead>
                {(paymentFilter === 'all' || paymentFilter === 'cash') && (
                  <TableHead className="text-right">Détail Cash</TableHead>
                )}
                {(paymentFilter === 'all' || paymentFilter === 'card') && (
                  <TableHead className="text-right">Détail Bancontact</TableHead>
                )}
                <TableHead className="text-right">Total Jour</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyBreakdown.map((day, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {format(day.date, 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-center">{day.transactions}</TableCell>
                  {(paymentFilter === 'all' || paymentFilter === 'cash') && (
                    <TableCell className="text-right">{day.cashAmount.toFixed(2)}€</TableCell>
                  )}
                  {(paymentFilter === 'all' || paymentFilter === 'card') && (
                    <TableCell className="text-right">{day.cardAmount.toFixed(2)}€</TableCell>
                  )}
                  <TableCell className="text-right font-semibold">{day.totalAmount.toFixed(2)}€</TableCell>
                </TableRow>
              ))}
              {/* Total Row */}
              <TableRow className="bg-primary/5 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-center">{totals.transactions}</TableCell>
                {(paymentFilter === 'all' || paymentFilter === 'cash') && (
                  <TableCell className="text-right">{totals.cashAmount.toFixed(2)}€</TableCell>
                )}
                {(paymentFilter === 'all' || paymentFilter === 'card') && (
                  <TableCell className="text-right">{totals.cardAmount.toFixed(2)}€</TableCell>
                )}
                <TableCell className="text-right">{totals.totalAmount.toFixed(2)}€</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default DetailedReportsView;
