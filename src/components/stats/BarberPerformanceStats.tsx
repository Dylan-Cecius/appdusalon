import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Scissors, Euro, Clock, Star } from "lucide-react";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";

export const BarberPerformanceStats = () => {
  const { barberPerformanceStats } = useAdvancedStats();

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

  const getSatisfactionColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-primary" />
          <CardTitle>Performance des coiffeurs</CardTitle>
        </div>
        <CardDescription>
          Statistiques détaillées par coiffeur
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {barberPerformanceStats
            .sort((a, b) => b.revenue - a.revenue)
            .map((barber, index) => {
              const performance = getPerformanceLevel(barber.revenue, barber.appointmentCount);
              
              return (
                <div key={`${barber.barberName}-${index}`} className="p-4 rounded-lg bg-card/50 border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
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
                      <div className="p-2 rounded-lg bg-yellow-500/10">
                        <Star className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <p className={`text-lg font-semibold ${getSatisfactionColor(barber.clientSatisfaction)}`}>
                          {barber.clientSatisfaction.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Satisfaction</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                      Moyenne par RDV: <span className="font-medium text-foreground">
                        {formatCurrency(barber.revenue / Math.max(barber.appointmentCount, 1))}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          
          {barberPerformanceStats.length === 0 && (
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