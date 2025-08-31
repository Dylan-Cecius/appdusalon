import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Calendar } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, addDays, addWeeks, addMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

type Granularity = 'day' | 'week' | 'month';

const RevenueChart = () => {
  const { transactions } = useSupabaseTransactions();
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return format(date, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Filter transactions in the date range
    const filteredTransactions = transactions.filter(tx => 
      tx.transactionDate >= start && tx.transactionDate <= end
    );

    let periods: Date[] = [];
    let formatString = '';
    let groupByFn: (date: Date) => string;

    switch (granularity) {
      case 'day':
        periods = eachDayOfInterval({ start, end });
        formatString = 'dd/MM';
        groupByFn = (date: Date) => format(startOfDay(date), 'yyyy-MM-dd');
        break;
      case 'week':
        periods = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
        formatString = 'dd/MM';
        groupByFn = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'month':
        periods = eachMonthOfInterval({ start, end });
        formatString = 'MMM yyyy';
        groupByFn = (date: Date) => format(startOfMonth(date), 'yyyy-MM-dd');
        break;
    }

    // Group transactions by period
    const transactionsByPeriod = filteredTransactions.reduce((acc, tx) => {
      const periodKey = groupByFn(tx.transactionDate);
      if (!acc[periodKey]) {
        acc[periodKey] = [];
      }
      acc[periodKey].push(tx);
      return acc;
    }, {} as Record<string, typeof filteredTransactions>);

    // Create chart data points
    const data = periods.map(period => {
      const periodKey = format(period, 'yyyy-MM-dd');
      const periodTransactions = transactionsByPeriod[periodKey] || [];
      const revenue = periodTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
      const transactionCount = periodTransactions.length;

      return {
        date: format(period, formatString, { locale: fr }),
        revenue: Math.round(revenue * 100) / 100,
        transactions: transactionCount,
        fullDate: periodKey
      };
    });

    return data;
  }, [transactions, granularity, startDate, endDate]);

  const totalRevenue = chartData.reduce((sum, data) => sum + data.revenue, 0);
  const totalTransactions = chartData.reduce((sum, data) => sum + data.transactions, 0);

  const chartConfig = {
    revenue: {
      label: "Chiffre d'affaires",
      color: "hsl(var(--primary))"
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Évolution du chiffre d'affaires</h3>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="granularity">Granularité</Label>
          <Select value={granularity} onValueChange={(value: Granularity) => setGranularity(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Par jour</SelectItem>
              <SelectItem value="week">Par semaine</SelectItem>
              <SelectItem value="month">Par mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary mb-1">
            {totalRevenue.toFixed(2)}€
          </p>
          <p className="text-sm text-muted-foreground">Total CA</p>
        </Card>
        
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary mb-1">
            {totalTransactions}
          </p>
          <p className="text-sm text-muted-foreground">Transactions</p>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <Card className="p-4">
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}€`}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      `${Number(value).toFixed(2)}€`,
                      "Chiffre d'affaires"
                    ]}
                    labelFormatter={(label) => `Période: ${label}`}
                  />
                }
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="var(--color-revenue)" 
                strokeWidth={3}
                dot={{ fill: "var(--color-revenue)", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "var(--color-revenue)", strokeWidth: 2 }}
              />
            </LineChart>
          </ChartContainer>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h4 className="text-lg font-medium mb-2">Aucune donnée</h4>
          <p className="text-muted-foreground">
            Aucune transaction trouvée pour la période sélectionnée.
          </p>
        </Card>
      )}
    </Card>
  );
};

export default RevenueChart;