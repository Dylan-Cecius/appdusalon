import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock } from "lucide-react";
import { useAdvancedStats } from "@/hooks/useAdvancedStats";

export const PeakHoursStats = () => {
  const { peakHoursStats } = useAdvancedStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getBarColor = (appointmentCount: number, maxCount: number) => {
    const intensity = appointmentCount / Math.max(maxCount, 1);
    if (intensity >= 0.8) return "hsl(var(--primary))";
    if (intensity >= 0.6) return "hsl(var(--primary) / 0.8)";
    if (intensity >= 0.4) return "hsl(var(--primary) / 0.6)";
    if (intensity >= 0.2) return "hsl(var(--primary) / 0.4)";
    return "hsl(var(--primary) / 0.2)";
  };

  const maxAppointments = Math.max(...peakHoursStats.map(stat => stat.appointmentCount), 1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-md p-3">
          <p className="font-semibold">{label}</p>
          <p className="text-primary">
            <span className="font-medium">{data.appointmentCount}</span> rendez-vous
          </p>
          <p className="text-green-600">
            Revenus: <span className="font-medium">{formatCurrency(data.revenue)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const getPeakHours = () => {
    const sorted = [...peakHoursStats].sort((a, b) => b.appointmentCount - a.appointmentCount);
    return sorted.slice(0, 3);
  };

  const peakHours = getPeakHours();

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Heures de pointe</CardTitle>
        </div>
        <CardDescription>
          Répartition des rendez-vous par heure de la journée
        </CardDescription>
      </CardHeader>
      <CardContent>
        {peakHoursStats.length > 0 ? (
          <div className="space-y-6">
            {/* Top 3 heures de pointe */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">TOP HEURES DE POINTE</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {peakHours.map((hour, index) => (
                  <div key={hour.hour} className="text-center p-4 rounded-lg bg-primary/5 border">
                    <div className="text-2xl font-bold text-primary mb-1">
                      {hour.hour}
                    </div>
                    <div className="text-lg font-semibold mb-1">
                      {hour.appointmentCount} RDV
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(hour.revenue)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Graphique */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">RÉPARTITION HORAIRE</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHoursStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="appointmentCount" 
                      radius={[4, 4, 0, 0]}
                    >
                      {peakHoursStats.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getBarColor(entry.appointmentCount, maxAppointments)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Statistiques supplémentaires */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">
                  {peakHoursStats.reduce((sum, stat) => sum + stat.appointmentCount, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total RDV</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(peakHoursStats.reduce((sum, stat) => sum + stat.revenue, 0))}
                </p>
                <p className="text-xs text-muted-foreground">Total revenus</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-orange-600">
                  {peakHours[0]?.hour || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">Heure de pointe</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-blue-600">
                  {(peakHoursStats.reduce((sum, stat) => sum + stat.revenue, 0) / 
                    Math.max(peakHoursStats.reduce((sum, stat) => sum + stat.appointmentCount, 0), 1)
                  ).toFixed(0)}€
                </p>
                <p className="text-xs text-muted-foreground">Moy./RDV</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune donnée d'heures de pointe disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};