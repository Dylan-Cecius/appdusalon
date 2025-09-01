import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Crown, 
  TrendingUp, 
  DollarSign, 
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Mail,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Subscriber {
  id: string;
  user_id: string;
  email: string;
  stripe_customer_id: string | null;
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  lifetimeUsers: number;
}

const Admin = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    lifetimeUsers: 0
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check admin access
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    if (user.email !== 'dylan.cecius@gmail.com') {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  // Fetch subscribers and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all subscribers
      const { data: subscribersData, error: subscribersError } = await supabase
        .from('subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (subscribersError) throw subscribersError;

      setSubscribers(subscribersData || []);
      
      // Calculate stats
      const totalUsers = subscribersData?.length || 0;
      const activeSubscriptions = subscribersData?.filter(s => s.subscribed).length || 0;
      const lifetimeUsers = subscribersData?.filter(s => s.subscription_tier === 'Enterprise').length || 0;
      
      // Estimate revenue (basic calculation)
      const totalRevenue = subscribersData?.reduce((sum, sub) => {
        if (!sub.subscribed) return sum;
        if (sub.subscription_tier === 'Enterprise') return sum + 468; // Lifetime
        if (sub.subscription_tier === 'Pro') return sum + 39; // Monthly
        if (sub.subscription_tier === 'Starter') return sum + 19; // Monthly
        return sum;
      }, 0) || 0;

      setStats({
        totalUsers,
        activeSubscriptions,
        totalRevenue,
        lifetimeUsers
      });

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter subscribers
  useEffect(() => {
    let filtered = subscribers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.subscription_tier && sub.subscription_tier.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(sub => sub.subscribed);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(sub => !sub.subscribed);
      } else if (statusFilter === 'lifetime') {
        filtered = filtered.filter(sub => sub.subscription_tier === 'Enterprise');
      }
    }

    setFilteredSubscribers(filtered);
  }, [subscribers, searchTerm, statusFilter]);

  const updateSubscription = async (userId: string, updates: Partial<Subscriber>) => {
    try {
      const { error } = await supabase
        .from('subscribers')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Abonnement mis à jour",
      });

      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'abonnement",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (subscriber: Subscriber) => {
    if (!subscriber.subscribed) {
      return <Badge variant="secondary">Inactif</Badge>;
    }
    
    if (subscriber.subscription_tier === 'Enterprise') {
      return <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">À vie</Badge>;
    }
    
    if (subscriber.subscription_tier === 'Pro') {
      return <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">Pro</Badge>;
    }
    
    if (subscriber.subscription_tier === 'Starter') {
      return <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">Starter</Badge>;
    }
    
    return <Badge variant="default">Actif</Badge>;
  };

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
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilisateurs totaux</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Tous les comptes créés
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Abonnements actifs</CardTitle>
                  <Crown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.activeSubscriptions}</div>
                  <p className="text-xs text-muted-foreground">
                    Utilisateurs payants
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenus estimés</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.totalRevenue}€</div>
                  <p className="text-xs text-muted-foreground">
                    Revenus mensuels + lifetime
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Abonnements à vie</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{stats.lifetimeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Plans Enterprise
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
                <CardDescription>Derniers utilisateurs inscrits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subscribers.slice(0, 5).map((subscriber) => (
                    <div key={subscriber.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{subscriber.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Inscrit le {format(new Date(subscriber.created_at), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(subscriber)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Recherche et filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par email ou plan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrer par statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="active">Actifs</SelectItem>
                      <SelectItem value="inactive">Inactifs</SelectItem>
                      <SelectItem value="lifetime">À vie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Liste des utilisateurs ({filteredSubscribers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Fin d'abonnement</TableHead>
                        <TableHead>Inscrit le</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscribers.map((subscriber) => (
                        <TableRow key={subscriber.id}>
                          <TableCell className="font-medium">{subscriber.email}</TableCell>
                          <TableCell>{getStatusBadge(subscriber)}</TableCell>
                          <TableCell>{subscriber.subscription_tier || '-'}</TableCell>
                          <TableCell>
                            {subscriber.subscription_end 
                              ? format(new Date(subscriber.subscription_end), 'dd/MM/yyyy', { locale: fr })
                              : subscriber.subscription_tier === 'Enterprise' 
                                ? 'À vie' 
                                : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {format(new Date(subscriber.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {subscriber.subscribed ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateSubscription(subscriber.user_id, { 
                                    subscribed: false, 
                                    subscription_tier: null,
                                    subscription_end: null 
                                  })}
                                >
                                  Désactiver
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateSubscription(subscriber.user_id, { 
                                    subscribed: true, 
                                    subscription_tier: 'Pro' 
                                  })}
                                >
                                  Activer Pro
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres d'administration</CardTitle>
                <CardDescription>
                  Configuration des fonctionnalités administratives
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Cette section est réservée aux administrateurs systèmes. 
                    Seuls les utilisateurs autorisés peuvent accéder à cette interface.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;