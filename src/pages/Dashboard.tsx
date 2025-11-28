import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useCombinedStats } from '@/hooks/useCombinedStats';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MainLayout from '@/components/MainLayout';
import { DollarSign, Users, Calendar, AlertTriangle, TrendingUp, ArrowRight, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Rediriger vers la page de connexion si non authentifié
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Afficher un écran de chargement pendant la vérification
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="p-3 bg-accent rounded-lg mb-4 inline-block">
            <Scissors className="h-8 w-8 text-accent-foreground animate-spin" />
          </div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Ne rien afficher si non authentifié (redirection en cours)
  if (!user) {
    return null;
  }
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Tableau de bord</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Vue d'ensemble de votre activité</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button asChild variant="outline" className="w-full sm:w-auto min-h-[44px]">
              <Link to="/stats" className="flex items-center justify-center">
                <TrendingUp className="mr-2 h-4 w-4" />
                <span className="text-sm sm:text-base">Stats</span>
              </Link>
            </Button>
            <Button asChild className="w-full sm:w-auto min-h-[44px]">
              <Link to="/pos" className="flex items-center justify-center">
                <DollarSign className="mr-2 h-4 w-4" />
                <span className="text-sm sm:text-base">Encaissement</span>
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

        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">CA du jour</CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.todayRevenue.toFixed(2)} €</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">CA aujourd'hui</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">CA du mois</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.monthlyRevenue.toFixed(2)} €</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">CA mensuel</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Clients</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{stats.todayClients}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Aujourd'hui</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">RDV</CardTitle>
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-lg sm:text-2xl font-bold">{upcomingAppointments.length}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">À venir</p>
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
              <div className="space-y-2 sm:space-y-3">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors min-h-[60px]">
                    <div className="flex-1">
                      <p className="font-medium text-sm sm:text-base">{apt.clientName}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {format(new Date(apt.startTime), 'EEEE dd MMMM yyyy • HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-semibold text-primary text-sm sm:text-base">{apt.totalPrice.toFixed(2)} €</p>
                      <p className="text-xs text-muted-foreground capitalize">{apt.status}</p>
                    </div>
                  </div>
                ))}
                <Button asChild variant="ghost" className="w-full min-h-[44px]">
                  <Link to="/agenda" className="flex items-center justify-center">
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
