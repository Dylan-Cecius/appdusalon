import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, Clock, Target } from "lucide-react";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";

export const OccupancyRateStats = () => {
  const { occupancyStats } = useAdvancedStats();

  const getOccupancyLevel = (rate: number) => {
    if (rate >= 90) return { 
      label: "Saturé", 
      color: "text-red-600 bg-red-50 dark:bg-red-950/20",
      progressColor: "bg-red-500",
      recommendation: "Envisagez d'ajouter des créneaux ou un coiffeur"
    };
    if (rate >= 70) return { 
      label: "Optimal", 
      color: "text-green-600 bg-green-50 dark:bg-green-950/20",
      progressColor: "bg-green-500",
      recommendation: "Excellent taux d'occupation"
    };
    if (rate >= 50) return { 
      label: "Correct", 
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20",
      progressColor: "bg-blue-500",
      recommendation: "Bonne occupation, des créneaux restent disponibles"
    };
    if (rate >= 30) return { 
      label: "Faible", 
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950/20",
      progressColor: "bg-orange-500",
      recommendation: "Promotion ou ajustement des horaires conseillé"
    };
    return { 
      label: "Très faible", 
      color: "text-gray-600 bg-gray-50 dark:bg-gray-950/20",
      progressColor: "bg-gray-500",
      recommendation: "Stratégie marketing nécessaire"
    };
  };

  const averageOccupancy = occupancyStats.length > 0 
    ? occupancyStats.reduce((sum, stat) => sum + stat.occupancyRate, 0) / occupancyStats.length 
    : 0;

  const averageLevel = getOccupancyLevel(averageOccupancy);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const level = getOccupancyLevel(data.occupancyRate);
      return (
        <div className="bg-background border rounded-lg shadow-md p-3">
          <p className="font-semibold">{label}</p>
          <p className="text-primary">
            <span className="font-medium">{data.occupancyRate.toFixed(1)}%</span> d'occupation
          </p>
          <p className="text-muted-foreground text-sm">
            {data.bookedSlots} / {data.totalSlots} créneaux
          </p>
          <p className={`text-xs ${level.color.split(' ')[0]} font-medium mt-1`}>
            {level.label}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Taux d'occupation</CardTitle>
        </div>
        <CardDescription>
          Utilisation des créneaux disponibles sur 7 jours
        </CardDescription>
      </CardHeader>
      <CardContent>
        {occupancyStats.length > 0 ? (
          <div className="space-y-6">
            {/* Vue d'ensemble */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-card/50 border">
                <div className="text-3xl font-bold text-primary mb-1">
                  {averageOccupancy.toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground mb-2">Occupation moyenne</p>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${averageLevel.color}`}>
                  {averageLevel.label}
                </div>
              </div>

              <div className="text-center p-4 rounded-lg bg-card/50 border">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {occupancyStats.reduce((sum, stat) => sum + stat.bookedSlots, 0)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">Créneaux réservés</p>
                <div className="text-xs text-muted-foreground">
                  sur {occupancyStats.reduce((sum, stat) => sum + stat.totalSlots, 0)} disponibles
                </div>
              </div>

              <div className="text-center p-4 rounded-lg bg-card/50 border">
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {Math.max(...occupancyStats.map(stat => stat.occupancyRate)).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground mb-2">Pic d'occupation</p>
                <div className="text-xs text-muted-foreground">
                  {occupancyStats.find(stat => 
                    stat.occupancyRate === Math.max(...occupancyStats.map(s => s.occupancyRate))
                  )?.date}
                </div>
              </div>
            </div>

            {/* Graphique d'évolution */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">ÉVOLUTION SUR 7 JOURS</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={occupancyStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="occupancyRate" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Détail par jour */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">DÉTAIL PAR JOUR</h4>
              <div className="space-y-3">
                {occupancyStats.map((stat, index) => {
                  const level = getOccupancyLevel(stat.occupancyRate);
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-card/30 border">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium min-w-[3rem]">
                          {stat.date}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {stat.bookedSlots} / {stat.totalSlots} créneaux
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-24">
                          <Progress 
                            value={stat.occupancyRate} 
                            className="h-2"
                            style={{
                              '--progress-foreground': level.progressColor
                            } as React.CSSProperties}
                          />
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium min-w-[4rem] text-center ${level.color}`}>
                          {stat.occupancyRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommandations */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <Target className="h-4 w-4 text-primary mt-0.5" />
                <h5 className="font-medium text-sm">Recommandation</h5>
              </div>
              <p className="text-sm text-muted-foreground">
                {averageLevel.recommendation}
              </p>
              {averageOccupancy < 50 && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">💡 Suggestions d'optimisation :</p>
                  <ul className="space-y-1">
                    <li>• Proposer des promotions heures creuses</li>
                    <li>• Ajuster les horaires selon la demande</li>
                    <li>• Développer la communication digitale</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune donnée d'occupation disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};