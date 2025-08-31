import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, UserPlus, UserCheck } from "lucide-react";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";

export const ClientRetentionStats = () => {
  const { clientRetentionStats } = useAdvancedStats();

  const getRetentionColor = (rate: number) => {
    if (rate >= 80) return "text-green-600 bg-green-50 dark:bg-green-950/20";
    if (rate >= 60) return "text-orange-600 bg-orange-50 dark:bg-orange-950/20";
    return "text-red-600 bg-red-50 dark:bg-red-950/20";
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return "bg-green-500";
    if (rate >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Rétention clients</CardTitle>
        </div>
        <CardDescription>
          Taux de retour des clients par période
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {clientRetentionStats.map((stat, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{stat.period}</h4>
                <div className={`px-2 py-1 rounded-full text-sm font-medium ${getRetentionColor(stat.retentionRate)}`}>
                  {stat.retentionRate.toFixed(1)}%
                </div>
              </div>
              
              <Progress 
                value={stat.retentionRate} 
                className="h-2"
                style={{
                  '--progress-foreground': getProgressColor(stat.retentionRate)
                } as React.CSSProperties}
              />
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <UserPlus className="h-4 w-4" />
                    <span>{stat.newClients} nouveaux</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserCheck className="h-4 w-4" />
                    <span>{stat.returningClients} fidélisés</span>
                  </div>
                </div>
                <span className="text-xs">
                  Total: {stat.newClients + stat.returningClients}
                </span>
              </div>
            </div>
          ))}
          
          {clientRetentionStats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune donnée de rétention disponible</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};