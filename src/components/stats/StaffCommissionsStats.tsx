import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStaff } from '@/hooks/useStaff';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Users, Euro, CalendarDays, Percent } from 'lucide-react';

export const StaffCommissionsStats = () => {
  const { user } = useAuth();
  const { activeStaff } = useStaff();

  const { data: transactions = [] } = useQuery({
    queryKey: ['staff-commission-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('transactions' as any)
        .select('staff_id, total_amount, transaction_date');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['staff-commission-appointments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('appointments' as any)
        .select('staff_id, status');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const stats = useMemo(() => {
    return activeStaff.map(s => {
      const staffTx = transactions.filter((t: any) => t.staff_id === s.id);
      const revenue = staffTx.reduce((sum: number, t: any) => sum + Number(t.total_amount), 0);
      const commission = revenue * (s.commission_rate / 100);
      const rdvCount = appointments.filter((a: any) => a.staff_id === s.id).length;
      return { ...s, revenue, commission, rdvCount };
    });
  }, [activeStaff, transactions, appointments]);

  if (activeStaff.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Commissions par prestataire
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map(s => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: s.color }}>
                  {s.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.role} • {s.commission_rate}%</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground"><Euro className="h-3.5 w-3.5" />CA généré</span>
                  <span className="font-medium">{s.revenue.toFixed(2)}€</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground"><Percent className="h-3.5 w-3.5" />Commission</span>
                  <span className="font-medium text-primary">{s.commission.toFixed(2)}€</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />RDV</span>
                  <span className="font-medium">{s.rdvCount}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
