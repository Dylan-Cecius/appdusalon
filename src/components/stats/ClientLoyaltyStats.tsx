import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Euro, Calendar } from "lucide-react";
import { useAdvancedStats, ClientLoyaltyData } from "@/hooks/useAdvancedStats";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export const ClientLoyaltyStats = () => {
  const { clientLoyaltyStats } = useAdvancedStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getLoyaltyLevel = (appointmentCount: number) => {
    if (appointmentCount >= 10) return { label: "VIP", color: "bg-gradient-to-r from-gold-500 to-gold-600" };
    if (appointmentCount >= 5) return { label: "Fidèle", color: "bg-gradient-to-r from-primary to-primary-dark" };
    if (appointmentCount >= 3) return { label: "Régulier", color: "bg-gradient-to-r from-secondary to-secondary-dark" };
    return { label: "Nouveau", color: "bg-gradient-to-r from-muted to-muted-dark" };
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Fidélité clients</CardTitle>
        </div>
        <CardDescription>
          Top 10 des clients les plus fidèles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {clientLoyaltyStats.map((client, index) => {
            const loyaltyLevel = getLoyaltyLevel(client.appointmentCount);
            
            return (
              <div key={`${client.clientName}-${index}`} className="flex items-center justify-between p-4 rounded-lg bg-card/50 border">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={loyaltyLevel.color}>
                        {client.clientName.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Badge 
                      variant="outline" 
                      className="absolute -top-2 -right-2 text-xs px-1 py-0"
                    >
                      #{index + 1}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="font-medium">{client.clientName}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(client.lastVisit, 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className={loyaltyLevel.color}>
                      {loyaltyLevel.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{client.appointmentCount}</span>
                      <span className="text-muted-foreground">RDV</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Euro className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{formatCurrency(client.totalSpent)}</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    Moyenne: {formatCurrency(client.averageSpending)}
                  </p>
                </div>
              </div>
            );
          })}
          
          {clientLoyaltyStats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune donnée de fidélité disponible</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};