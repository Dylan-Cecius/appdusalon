import { Link } from 'react-router-dom';
import { useCombinedStats } from '@/hooks/useCombinedStats';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MainLayout from '@/components/MainLayout';
import { DollarSign, Users, Calendar, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Dashboard = () => {
  const { stats } = useCombinedStats();
  const { appointments } = useSupabaseAppointments();
  const { subscription_end, subscribed } = useSubscription();

  // Filtrer les 5 prochains rendez-vous à venir
  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.startTime) > new Date() && apt.status !== 'cancelled')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5);

  // Vérifier si l'abonnement expire dans moins de 7 jours
  const showSubscriptionAlert = subscribed && subscription_end && 
    new Date(subscription_end) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link to="/stats">
                <TrendingUp className="mr-2 h-4 w-4" />
                Voir toutes les stats
              </Link>
            </Button>
            <Button asChild>
              <Link to="/pos">
                <DollarSign className="mr-2 h-4 w-4" />
                Aller vers Encaissement
              </Link>
            </Button>
          </div>
        </div>

        {showSubscriptionAlert && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Abonnement bientôt expiré</AlertTitle>
            <AlertDescription>
              Votre abonnement expire le {format(new Date(subscription_end!), 'dd MMMM yyyy', { locale: fr })}. 
              <Link to="/abonnements" className="underline ml-2">Renouveler maintenant</Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CA du jour</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayRevenue.toFixed(2)} €</div>
              <p className="text-xs text-muted-foreground">Chiffre d'affaires aujourd'hui</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CA du mois</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyRevenue.toFixed(2)} €</div>
              <p className="text-xs text-muted-foreground">Chiffre d'affaires mensuel</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients du jour</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayClients}</div>
              <p className="text-xs text-muted-foreground">Nombre de clients aujourd'hui</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prochains RDV</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingAppointments.length}</div>
              <p className="text-xs text-muted-foreground">Rendez-vous à venir</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prochains rendez-vous
            </CardTitle>
            <CardDescription>Les 5 prochains rendez-vous programmés</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucun rendez-vous à venir</p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{apt.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(apt.startTime), 'EEEE dd MMMM yyyy • HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{apt.totalPrice.toFixed(2)} €</p>
                      <p className="text-xs text-muted-foreground capitalize">{apt.status}</p>
                    </div>
                  </div>
                ))}
                <Button asChild variant="ghost" className="w-full">
                  <Link to="/agenda">
                    Voir tous les rendez-vous
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
