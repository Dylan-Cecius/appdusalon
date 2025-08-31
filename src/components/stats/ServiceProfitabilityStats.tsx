import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Euro, Scissors, BarChart3 } from "lucide-react";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";

export const ServiceProfitabilityStats = () => {
  const { serviceProfitabilityStats } = useAdvancedStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getProfitabilityLevel = (margin: number) => {
    if (margin >= 80) return { label: "Excellent", color: "bg-gradient-to-r from-green-500 to-green-600", textColor: "text-green-700" };
    if (margin >= 60) return { label: "Très bon", color: "bg-gradient-to-r from-blue-500 to-blue-600", textColor: "text-blue-700" };
    if (margin >= 40) return { label: "Correct", color: "bg-gradient-to-r from-orange-500 to-orange-600", textColor: "text-orange-700" };
    return { label: "À améliorer", color: "bg-gradient-to-r from-red-500 to-red-600", textColor: "text-red-700" };
  };

  const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    if (name.includes('coupe') || name.includes('cut')) return "✂️";
    if (name.includes('barbe') || name.includes('beard')) return "🧔";
    if (name.includes('couleur') || name.includes('color')) return "🎨";
    if (name.includes('brushing')) return "💨";
    if (name.includes('soin') || name.includes('treatment')) return "💆";
    return "✨";
  };

  const totalRevenue = serviceProfitabilityStats.reduce((sum, service) => sum + service.revenue, 0);
  const totalAppointments = serviceProfitabilityStats.reduce((sum, service) => sum + service.appointmentCount, 0);

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Rentabilité des services</CardTitle>
        </div>
        <CardDescription>
          Analyse de performance par type de service
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serviceProfitabilityStats.length > 0 ? (
          <div className="space-y-6">
            {/* Vue d'ensemble */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">Revenus totaux</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalAppointments}</div>
                <p className="text-xs text-muted-foreground">Services rendus</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {serviceProfitabilityStats.length}
                </div>
                <p className="text-xs text-muted-foreground">Types de service</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalRevenue / Math.max(totalAppointments, 1))}
                </div>
                <p className="text-xs text-muted-foreground">Panier moyen</p>
              </div>
            </div>

            {/* Détail des services */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">PERFORMANCE PAR SERVICE</h4>
              {serviceProfitabilityStats.map((service, index) => {
                const profitability = getProfitabilityLevel(service.profitMargin);
                const revenuePercentage = (service.revenue / totalRevenue) * 100;
                
                return (
                  <div key={`${service.serviceName}-${index}`} className="p-4 rounded-lg bg-card/50 border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {getServiceIcon(service.serviceName)}
                        </div>
                        <div>
                          <h5 className="font-semibold">{service.serviceName}</h5>
                          <Badge className={profitability.color}>
                            {profitability.label}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">
                          {formatCurrency(service.revenue)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {revenuePercentage.toFixed(1)}% du CA total
                        </p>
                      </div>
                    </div>
                    
                    {/* Barre de progression des revenus */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Part des revenus</span>
                        <span className="font-medium">{revenuePercentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={revenuePercentage} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Scissors className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{service.appointmentCount}</p>
                          <p className="text-xs text-muted-foreground">Services rendus</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Euro className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{formatCurrency(service.averagePrice)}</p>
                          <p className="text-xs text-muted-foreground">Prix moyen</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <BarChart3 className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className={`text-lg font-semibold ${profitability.textColor}`}>
                            {service.profitMargin.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Marge estimée</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Barre de marge */}
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Rentabilité</span>
                        <span className={`font-medium ${profitability.textColor}`}>
                          {service.profitMargin.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(service.profitMargin, 100)} 
                        className="h-2"
                        style={{
                          '--progress-foreground': service.profitMargin >= 80 ? 'hsl(142 76% 36%)' :
                                                 service.profitMargin >= 60 ? 'hsl(221 83% 53%)' :
                                                 service.profitMargin >= 40 ? 'hsl(25 95% 53%)' :
                                                 'hsl(0 84% 60%)'
                        } as React.CSSProperties}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune donnée de rentabilité disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};