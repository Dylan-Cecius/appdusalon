import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";

export const CancellationRateStats = () => {
  const { cancellationStats } = useAdvancedStats();

  const getCancellationLevel = (rate: number) => {
    if (rate >= 20) return { 
      label: "Critique", 
      color: "text-red-600 bg-red-50 dark:bg-red-950/20",
      progressColor: "bg-red-500",
      icon: AlertTriangle,
      trend: "up"
    };
    if (rate >= 10) return { 
      label: "Élevé", 
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950/20",
      progressColor: "bg-orange-500",
      icon: TrendingUp,
      trend: "up"
    };
    if (rate >= 5) return { 
      label: "Modéré", 
      color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20",
      progressColor: "bg-yellow-500",
      icon: TrendingUp,
      trend: "stable"
    };
    return { 
      label: "Bon", 
      color: "text-green-600 bg-green-50 dark:bg-green-950/20",
      progressColor: "bg-green-500",
      icon: TrendingDown,
      trend: "down"
    };
  };

  const averageCancellationRate = cancellationStats.length > 0 
    ? cancellationStats.reduce((sum, stat) => sum + stat.cancellationRate, 0) / cancellationStats.length 
    : 0;

  const averageLevel = getCancellationLevel(averageCancellationRate);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-primary" />
          <CardTitle>Taux d'annulation</CardTitle>
        </div>
        <CardDescription>
          Suivi des annulations par période
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alerte si taux élevé */}
        {averageCancellationRate >= 15 && (
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              Taux d'annulation élevé ({averageCancellationRate.toFixed(1)}%). 
              Considérez améliorer la communication avec vos clients.
            </AlertDescription>
          </Alert>
        )}

        {/* Vue d'ensemble */}
        <div className="p-4 rounded-lg bg-card/50 border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Taux moyen d'annulation</h4>
            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-sm font-medium ${averageLevel.color}`}>
              <averageLevel.icon className="h-3 w-3" />
              {averageLevel.label}
            </div>
          </div>
          <div className="text-3xl font-bold text-primary mb-2">
            {averageCancellationRate.toFixed(1)}%
          </div>
          <Progress 
            value={Math.min(averageCancellationRate, 100)} 
            className="h-2"
            style={{
              '--progress-foreground': averageLevel.progressColor
            } as React.CSSProperties}
          />
        </div>

        {/* Détail par période */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">DÉTAIL PAR PÉRIODE</h4>
          {cancellationStats.map((stat, index) => {
            const level = getCancellationLevel(stat.cancellationRate);
            
            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium">{stat.period}</h5>
                    <level.icon className={`h-4 w-4 ${level.trend === 'up' ? 'text-red-500' : level.trend === 'down' ? 'text-green-500' : 'text-yellow-500'}`} />
                  </div>
                  <div className={`px-2 py-1 rounded-full text-sm font-medium ${level.color}`}>
                    {stat.cancellationRate.toFixed(1)}%
                  </div>
                </div>
                
                <Progress 
                  value={Math.min(stat.cancellationRate, 100)} 
                  className="h-2"
                  style={{
                    '--progress-foreground': level.progressColor
                  } as React.CSSProperties}
                />
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {stat.cancelledAppointments} annulés sur {stat.totalAppointments} RDV
                  </span>
                  <span className="text-xs">
                    {stat.totalAppointments - stat.cancelledAppointments} réalisés
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {cancellationStats.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune donnée d'annulation disponible</p>
          </div>
        )}

        {/* Conseils */}
        {averageCancellationRate > 0 && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg">
            <h5 className="font-medium mb-2 text-sm">💡 Conseils pour réduire les annulations</h5>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Envoyer des rappels SMS/email 24h avant</li>
              <li>• Demander confirmation 48h avant le RDV</li>
              <li>• Mettre en place une politique d'annulation</li>
              <li>• Proposer des créneaux de rattrapage</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};