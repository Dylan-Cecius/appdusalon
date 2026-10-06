import { Card } from '@/components/ui/card';
import { Users, TrendingUp } from 'lucide-react';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useStaff } from '@/hooks/useStaff';
import { useMemo } from 'react';

export const EmployeeRevenueStats = () => {
  const { appointments } = useSupabaseAppointments();
  const { activeStaff } = useStaff();

  const employeeRevenue = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthAppointments = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.startTime);
      return appointmentDate >= startOfMonth && appointment.isPaid;
    });

    const revenueByEmployee: Record<string, { name: string; revenue: number; count: number }> = {};

    monthAppointments.forEach(appointment => {
      const employeeId = appointment.staffId || appointment.barberId || 'unknown';

      if (!revenueByEmployee[employeeId]) {
        const member = activeStaff.find(staff => staff.id === employeeId);
        revenueByEmployee[employeeId] = {
          name: member?.name || 'Non assigné',
          revenue: 0,
          count: 0,
        };
      }

      revenueByEmployee[employeeId].revenue += Number(appointment.totalPrice);
      revenueByEmployee[employeeId].count += 1;
    });

    return Object.values(revenueByEmployee).sort((a, b) => b.revenue - a.revenue);
  }, [appointments, activeStaff]);

  const totalRevenue = employeeRevenue.reduce((sum, employee) => sum + employee.revenue, 0);

  return (
    <Card className="v2-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          CA par membre de l’équipe
        </h3>
        <TrendingUp className="h-5 w-5 text-muted-foreground" />
      </div>

      {employeeRevenue.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Aucune donnée pour ce mois</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employeeRevenue.map((employee, index) => {
            const percentage = totalRevenue > 0 ? (employee.revenue / totalRevenue) * 100 : 0;

            return (
              <div key={`${employee.name}-${index}`} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {employee.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.count} rendez-vous encaissé{employee.count > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{employee.revenue.toFixed(2)}€</p>
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
