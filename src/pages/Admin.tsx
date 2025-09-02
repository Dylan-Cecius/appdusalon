import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Shield, Users, Settings, BarChart3, Gift, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import PromoCodeManagement from '@/components/PromoCodeManagement';
import SubscriptionManagement from '@/components/SubscriptionManagement';
import { useAdminStats } from '@/hooks/useAdminStats';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stats, refreshStats } = useAdminStats();

  // Check admin access
  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (user.email !== 'dylan.cecius@gmail.com') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  if (!user || user.email !== 'dylan.cecius@gmail.com') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Shield className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-primary">
                    Administration Salon Pro
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Gestion des abonnements et utilisateurs
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="promos" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Codes promo
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Vue d'ensemble</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshStats}
                disabled={stats.loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${stats.loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilisateurs totaux</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.loading ? '...' : stats.totalUsers.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Nombre total d'utilisateurs inscrits
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Abonnements actifs</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.loading ? '...' : stats.activeSubscriptions.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Abonnements payants actifs
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Codes promo utilisés</CardTitle>
                  <Gift className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.loading ? '...' : stats.usedPromoCodes.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total des codes promo activés
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.loading ? (
                  <div className="text-sm text-muted-foreground">Chargement...</div>
                ) : stats.recentActivity.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Aucune activité récente</div>
                ) : (
                  <div className="space-y-4">
                    {stats.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{activity.message}</span>
                        <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des abonnements</CardTitle>
              </CardHeader>
              <CardContent>
                <SubscriptionManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des codes promotionnels</CardTitle>
              </CardHeader>
              <CardContent>
                <PromoCodeManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres système</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Configuration générale</h3>
                    <p className="text-sm text-muted-foreground">
                      Gérez les paramètres globaux de l'application
                    </p>
                  </div>
                  <Button variant="outline">
                    Configurer les notifications
                  </Button>
                  <Button variant="outline">
                    Gérer les sauvegardes
                  </Button>
                  <Button variant="outline">
                    Logs système
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;