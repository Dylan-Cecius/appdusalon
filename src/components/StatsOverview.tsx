import { TrendingUp, Euro, Users, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsData {
  todayRevenue: number;
  todayClients: number;
  monthlyRevenue: number;
  monthlyClients: number;
}

interface StatsOverviewProps {
  stats: StatsData;
}

const StatsOverview = ({ stats }: StatsOverviewProps) => {
  const statCards = [
    {
      title: "Chiffre d'affaires du jour",
      value: `${stats.todayRevenue.toFixed(2)}€`,
      icon: Euro,
      change: "+12%",
      changeType: "positive" as const
    },
    {
      title: "Clients aujourd'hui",
      value: stats.todayClients.toString(),
      icon: Users,
      change: "+3",
      changeType: "positive" as const
    },
    {
      title: "CA mensuel",
      value: `${stats.monthlyRevenue.toFixed(2)}€`,
      icon: TrendingUp,
      change: "+8%",
      changeType: "positive" as const
    },
    {
      title: "Clients ce mois",
      value: stats.monthlyClients.toString(),
      icon: Calendar,
      change: "+15%",
      changeType: "positive" as const
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={index} 
            className="p-4 bg-gradient-to-br from-card to-background border-2 hover:border-accent/50 transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${
                index === 0 ? 'bg-accent/10 text-accent-foreground' :
                index === 1 ? 'bg-pos-success/10 text-pos-success' :
                index === 2 ? 'bg-primary/10 text-primary' :
                'bg-pos-card/10 text-pos-card'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-pos-success' : 'text-destructive'
              }`}>
                {stat.change}
              </span>
            </div>
            
            <div>
              <p className="text-2xl font-bold text-primary mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.title}</p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default StatsOverview;