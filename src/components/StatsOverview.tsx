import { TrendingUp, Euro, Users, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsData {
  todayRevenue: number;
  todayClients: number;
  weeklyRevenue: number;
  weeklyClients: number;
  monthlyRevenue: number;
  monthlyClients: number;
  paymentStats: {
    today: {
      cash: number;
      card: number;
      cashPercent: number;
      cardPercent: number;
    };
    weekly: {
      cash: number;
      card: number;
      cashPercent: number;
      cardPercent: number;
    };
    monthly: {
      cash: number;
      card: number;
      cashPercent: number;
      cardPercent: number;
    };
  };
}

interface StatsOverviewProps {
  stats: StatsData;
}

const StatsOverview = ({ stats }: StatsOverviewProps) => {
  const statCards = [
    // CA Section
    {
      title: "CA du jour",
      value: `${stats.todayRevenue.toFixed(2)}€`,
      icon: Euro,
      color: "bg-accent/10 text-accent-foreground"
    },
    {
      title: "CA hebdomadaire",
      value: `${stats.weeklyRevenue.toFixed(2)}€`,
      icon: TrendingUp,
      color: "bg-primary/10 text-primary"
    },
    {
      title: "CA du mois",
      value: `${stats.monthlyRevenue.toFixed(2)}€`,
      icon: TrendingUp,
      color: "bg-pos-success/10 text-pos-success"
    },
    // Clients Section
    {
      title: "Clients du jour",
      value: stats.todayClients.toString(),
      icon: Users,
      color: "bg-pos-card/10 text-pos-card"
    },
    {
      title: "Clients hebdomadaire",
      value: stats.weeklyClients.toString(),
      icon: Users,
      color: "bg-purple-500/10 text-purple-600"
    },
    {
      title: "Clients du mois",
      value: stats.monthlyClients.toString(),
      icon: Calendar,
      color: "bg-orange-500/10 text-orange-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Revenue Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-primary">📈 Chiffre d'affaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.slice(0, 3).map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className="p-4 bg-gradient-to-br from-card to-background border-2 hover:border-accent/50 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                
                <div>
                  <p className="text-2xl font-bold text-primary mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Clients Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-primary">👥 Nombre de clients</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.slice(3, 6).map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index + 3} 
                className="p-4 bg-gradient-to-br from-card to-background border-2 hover:border-accent/50 transition-all duration-300 hover:shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                
                <div>
                  <p className="text-2xl font-bold text-primary mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;