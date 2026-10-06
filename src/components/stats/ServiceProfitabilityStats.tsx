import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Euro, Scissors } from "lucide-react";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";

export const ServiceProfitabilityStats = () => {
  const { serviceProfitabilityStats } = useAdvancedStats();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);

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
    <Card className="v2-panel col-span-1 lg:col-span-2" id="service-profitability">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Performance des services</CardTitle>
        </div>
        <CardDescription>
          Revenus et volume par prestation, basés uniquement sur les ventes enregistrées.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serviceProfitabilityStats.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">Revenus totaux</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{totalAppointments}</div>
                <p className="text-xs text-muted-foreground">Services vendus</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {serviceProfitabilityStats.length}
                </div>
                <p className="text-xs text-muted-foreground">Prestations actives</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalRevenue / Math.max(totalAppointments, 1))}
                </div>
                <p className="text-xs text-muted-foreground">Prix moyen</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Performance par service
              </h4>

              {serviceProfitabilityStats.map((service, index) => {
                const revenuePercentage = totalRevenue > 0
                  ? (service.revenue / totalRevenue) * 100
                  : 0;

                return (
                  <div key={`${service.serviceName}-${index}`} className="rounded-xl border bg-card/60 p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getServiceIcon(service.serviceName)}</div>
                        <div>
                          <h5 className="font-semibold">{service.serviceName}</h5>
                          <Badge variant="secondary">#{index + 1} par CA</Badge>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">
                          {formatCurrency(service.revenue)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {revenuePercentage.toFixed(1)}% du CA services
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Part des revenus</span>
                        <span className="font-medium">{revenuePercentage.toFixed(1)}%</span>
                      </div>
                      <Progress value={revenuePercentage} className="h-2" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Scissors className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{service.appointmentCount}</p>
                          <p className="text-xs text-muted-foreground">Services vendus</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Euro className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{formatCurrency(service.averagePrice)}</p>
                          <p className="text-xs text-muted-foreground">Prix moyen constaté</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              La marge n’est pas affichée tant qu’aucun coût direct par prestation n’est configuré.
            </p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune donnée de performance disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
