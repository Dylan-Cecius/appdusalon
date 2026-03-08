import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStaff } from '@/hooks/useStaff';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { TrendingUp, Euro, CalendarDays, Percent, BarChart3, Download } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Period = 'this_month' | 'last_month' | 'all';

const periodLabels: Record<Period, string> = {
  this_month: 'Ce mois',
  last_month: 'Mois dernier',
  all: 'Tout',
};

export const StaffPerformance = () => {
  const { user } = useAuth();
  const { activeStaff } = useStaff();
  const [period, setPeriod] = useState<Period>('this_month');

  const now = new Date();
  const dateRange = useMemo(() => {
    if (period === 'this_month') {
      return { from: startOfMonth(now).toISOString(), to: endOfMonth(now).toISOString() };
    }
    if (period === 'last_month') {
      const prev = subMonths(now, 1);
      return { from: startOfMonth(prev).toISOString(), to: endOfMonth(prev).toISOString() };
    }
    return null;
  }, [period]);

  const { data: transactions = [] } = useQuery({
    queryKey: ['staff-perf-tx', user?.id, period],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase.from('transactions').select('staff_id, total_amount, transaction_date');
      if (dateRange) {
        q = q.gte('transaction_date', dateRange.from).lte('transaction_date', dateRange.to);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['staff-perf-appts', user?.id, period],
    queryFn: async () => {
      if (!user) return [];
      let q = supabase.from('appointments').select('staff_id, start_time');
      if (dateRange) {
        q = q.gte('start_time', dateRange.from).lte('start_time', dateRange.to);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    return activeStaff.map(s => {
      const staffTx = transactions.filter(t => t.staff_id === s.id);
      const revenue = staffTx.reduce((sum, t) => sum + Number(t.total_amount), 0);
      const commission = revenue * (s.commission_rate / 100);
      const rdvCount = appointments.filter(a => a.staff_id === s.id).length;
      return { ...s, revenue, commission, rdvCount };
    });
  }, [activeStaff, transactions, appointments]);

  const totalRevenue = stats.reduce((s, x) => s + x.revenue, 0);

  if (activeStaff.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance de l'équipe
          </CardTitle>
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {(Object.keys(periodLabels) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
        {totalRevenue > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            CA total : <span className="font-semibold text-foreground">{totalRevenue.toFixed(2)}€</span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map(s => (
            <Card key={s.id} className="border-border/30 bg-muted/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role}</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Euro className="h-3.5 w-3.5" />
                      CA généré
                    </span>
                    <span className="font-semibold">{s.revenue.toFixed(2)}€</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Rendez-vous
                    </span>
                    <span className="font-semibold">{s.rdvCount}</span>
                  </div>
                  {s.commission_rate > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Percent className="h-3.5 w-3.5" />
                        Commission ({s.commission_rate}%)
                      </span>
                      <span className="font-semibold text-primary">{s.commission.toFixed(2)}€</span>
                    </div>
                  )}
                  {totalRevenue > 0 && (
                    <div className="pt-2 border-t border-border/30">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Part du CA
                        </span>
                        <span>{((s.revenue / totalRevenue) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-muted/50 rounded-full h-1.5 mt-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(s.revenue / totalRevenue) * 100}%`,
                            backgroundColor: s.color,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
