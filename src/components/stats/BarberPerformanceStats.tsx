import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Scissors, Euro, Clock, Trophy } from "lucide-react";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";
import { usePermissions } from "@/hooks/usePermissions";

export const BarberPerformanceStats = () => {
  const { barberPerformanceStats } = useAdvancedStats();
  const { permissions } = usePermissions();

  // Filter based on permissions
  const filteredStats = permissions.isAdmin
    ? barberPerformanceStats
    : barberPerformanceStats.filter(stat => stat.employeeId === permissions.employeeId);

  // Sort by revenue for rankings
  const sortedStats = [...filteredStats].sort((a, b) => b.revenue - a.revenue);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
    }
    return `${mins}min`;
  };

  const getPerformanceLevel = (revenue: number, appointmentCount: number) => {
    const avgRevenue = revenue / Math.max(appointmentCount, 1);
    if (avgRevenue >= 50) return { label: "Excellent", color: "bg-gradient-to-r from-green-500 to-green-600" };
    if (avgRevenue >= 30) return { label: "Très bien", color: "bg-gradient-to-r from-blue-500 to-blue-600" };
    if (avgRevenue >= 20) return { label: "Bien", color: "bg-gradient-to-r from-orange-500 to-orange-600" };
    return { label: "En progression", color: "bg-gradient-to-r from-gray-500 to-gray-600" };
  };

  if (sortedStats.length === 0) {
    return null;
  }

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          {permissions.isAdmin ? (
            <>
              <Trophy className="h-5 w-5 text-primary" />
              <CardTitle>Performance des employés</CardTitle>
            </>
          ) : (
            <>
              <Scissors className="h-5 w-5 text-primary" />
              <CardTitle>Mes performances</CardTitle>
            </>
          )}
        </div>
        <CardDescription>
          {permissions.isAdmin ? 'Classement et statistiques détaillées' : 'Vos statistiques du mois'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedStats.map((barber, index) => {
            const performance = getPerformanceLevel(barber.revenue, barber.appointmentCount);
            
            return (
              <div key={`${barber.barberName}-${index}`} className="p-4 rounded-lg bg-card/50 border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {permissions.isAdmin && (
                      <div className="text-3xl font-bold text-muted-foreground">
                        #{index + 1}
                      </div>
                    )}
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={performance.color}>
                        {barber.barberName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{barber.barberName}</h4>
                      <Badge className={performance.color}>
                        {performance.label}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(barber.revenue)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Chiffre d'affaires
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Scissors className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{barber.appointmentCount}</p>
                      <p className="text-xs text-muted-foreground">Rendez-vous</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{formatTime(barber.averageServiceTime)}</p>
                      <p className="text-xs text-muted-foreground">Temps moyen</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Euro className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(barber.revenue / barber.appointmentCount || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Panier moyen</p>
                    </div>
                  </div>
                </div>

                {permissions.isAdmin && sortedStats.length > 1 && (
                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(barber.revenue / sortedStats[0].revenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {sortedStats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Scissors className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune donnée de performance disponible</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
