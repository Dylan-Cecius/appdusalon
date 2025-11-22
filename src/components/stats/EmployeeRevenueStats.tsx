import { Card } from '@/components/ui/card';
import { Users, TrendingUp } from 'lucide-react';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const EmployeeRevenueStats = () => {
  const { appointments } = useSupabaseAppointments();

  // Fetch barbers data
  const { data: barbers = [] } = useQuery({
    queryKey: ['barbers'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  const employeeRevenue = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter appointments for current month (only paid ones)
    const monthAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfMonth && apt.isPaid;
    });

    // Group by barber
    const revenueByBarber: Record<string, { name: string; revenue: number; count: number }> = {};

    monthAppointments.forEach(apt => {
      const barberId = apt.barberId || 'unknown';
      if (!revenueByBarber[barberId]) {
        const barber = barbers.find(b => b.id === barberId);
        revenueByBarber[barberId] = {
          name: barber?.name || 'Non assigné',
          revenue: 0,
          count: 0,
        };
      }
      revenueByBarber[barberId].revenue += Number(apt.totalPrice);
      revenueByBarber[barberId].count += 1;
    });

    // Sort by revenue
    return Object.values(revenueByBarber).sort((a, b) => b.revenue - a.revenue);
  }, [appointments, barbers]);

  const totalRevenue = employeeRevenue.reduce((sum, emp) => sum + emp.revenue, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          CA par Coiffeur (mois)
        </h3>
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
      </div>
      
      {employeeRevenue.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Aucune donnée pour ce mois</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employeeRevenue.map((emp, index) => {
            const percentage = totalRevenue > 0 ? (emp.revenue / totalRevenue) * 100 : 0;
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {emp.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.count} client{emp.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{emp.revenue.toFixed(2)}€</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
