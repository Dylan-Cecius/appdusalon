import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ShoppingCart, Calendar, CheckSquare, BarChart3, FileText, Settings as SettingsIcon, User, LogOut, Scissors, DollarSign, Mail, Crown, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { useCombinedStats } from '@/hooks/useCombinedStats';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ServiceCard from '@/components/ServiceCard';
import CartSidebar from '@/components/CartSidebar';
import AppleCalendar from '@/components/AppleCalendar';
import TodoList from '@/components/TodoList';
import StatsOverview from '@/components/StatsOverview';
import PaymentMethodStats from '@/components/PaymentMethodStats';
import CustomPaymentStats from '@/components/CustomPaymentStats';
import CustomDateRangeStats from '@/components/CustomDateRangeStats';
import RevenueChart from '@/components/RevenueChart';
import EmailReports from '@/components/EmailReports';
import { ClientRetentionStats } from '@/components/stats/ClientRetentionStats';
import { BarberPerformanceStats } from '@/components/stats/BarberPerformanceStats';
import { PeakHoursStats } from '@/components/stats/PeakHoursStats';
import { CancellationRateStats } from '@/components/stats/CancellationRateStats';
import { ServiceProfitabilityStats } from '@/components/stats/ServiceProfitabilityStats';
import { OccupancyRateStats } from '@/components/stats/OccupancyRateStats';
import Settings from '@/components/Settings';
import StatsPasswordModal from '@/components/StatsPasswordModal';
import TransactionsManager from '@/components/TransactionsManager';
import SubscriptionManagement from '@/components/SubscriptionManagement';
import SubscriptionBadge from '@/components/SubscriptionBadge';
import { SubscriptionRightsDisplay } from '@/components/SubscriptionRightsDisplay';
import { FeatureGate } from '@/components/FeatureGate';
import AutomatedReports from '@/components/AutomatedReports';
import SecurityAlert from '@/components/SecurityAlert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSubscription } from '@/hooks/useSubscription';

interface CartItem {
  id: string;
  name: string;
  price: number;
  duration: number;
  quantity: number;
}

const Index = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [currentView, setCurrentView] = useState<string>('pos');
  const [showStatsPasswordModal, setShowStatsPasswordModal] = useState(false);
  const [showSettingsPasswordModal, setShowSettingsPasswordModal] = useState(false);
  const [showReportsPasswordModal, setShowReportsPasswordModal] = useState(false);
  const [isStatsUnlocked, setIsStatsUnlocked] = useState(false);
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [isReportsUnlocked, setIsReportsUnlocked] = useState(false);
  const [isTransactionsManagerOpen, setIsTransactionsManagerOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const {
    toast
  } = useToast();
  const {
    user,
    loading,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const {
    salonSettings
  } = useSupabaseSettings();
  const {
    services,
    loading: servicesLoading,
    categories
  } = useSupabaseServices();
  const {
    addTransaction
  } = useSupabaseTransactions();
  const { stats } = useCombinedStats();
  const {
    subscribed,
    subscription_tier,
    loading: subscriptionLoading
  } = useSubscription();
  const isMobile = useIsMobile();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Show loading while checking authentication
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="p-3 bg-accent rounded-lg mb-4 inline-block">
            <Scissors className="h-8 w-8 text-accent-foreground animate-spin" />
          </div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>;
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }


  // Secure password verification functions
  const verifyStatsPassword = async (inputPassword: string): Promise<boolean> => {
    console.log('verifyStatsPassword called with:', { 
      inputPassword: inputPassword?.length > 0 ? '[PASSWORD PROVIDED]' : '[NO PASSWORD]',
      salonSettings: salonSettings ? 'LOADED' : 'NOT LOADED',
      hasStatsPassword: !!salonSettings?.stats_password,
      statsPasswordType: salonSettings?.stats_password?.startsWith('$2') ? 'HASHED' : 'PLAIN_TEXT'
    });

    if (!salonSettings?.stats_password) {
      console.log('No stats password configured');
      toast({
        title: "❌ Aucun mot de passe configuré",
        description: "Définissez un mot de passe sécurisé dans les paramètres.",
        variant: "destructive",
      });
      return false; // No access without password
    }

    // Only allow hashed passwords - no plain text fallback for security
    if (!salonSettings.stats_password.startsWith('$2')) {
      console.log('Non-secure password detected for stats');
      toast({
        title: "🔒 Mot de passe non sécurisé détecté",
        description: "Veuillez définir un nouveau mot de passe sécurisé dans les paramètres.",
        variant: "destructive",
      });
      return false; // Force password reset for plain text passwords
    }

    try {
      console.log('Calling verify_password RPC');
      const {
        data,
        error
      } = await supabase.rpc('verify_password', {
        password_text: inputPassword,
        password_hash: salonSettings.stats_password
      });
      
      console.log('RPC result:', { data, error });
      
      if (error) {
        console.error('Password verification error:', error);
        return false;
      }
      return data === true;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  };
  const verifySettingsPassword = async (inputPassword: string): Promise<boolean> => {
    console.log('verifySettingsPassword called with:', { 
      inputPassword: inputPassword?.length > 0 ? '[PASSWORD PROVIDED]' : '[NO PASSWORD]',
      salonSettings: salonSettings ? 'LOADED' : 'NOT LOADED',
      hasStatsPassword: !!salonSettings?.stats_password,
      statsPasswordType: salonSettings?.stats_password?.startsWith('$2') ? 'HASHED' : 'PLAIN_TEXT'
    });

    if (!salonSettings?.stats_password) {
      console.log('No password configured for settings');
      toast({
        title: "❌ Aucun mot de passe configuré",
        description: "Définissez un mot de passe sécurisé dans les paramètres.",
        variant: "destructive",
      });
      return false; // No access without password
    }

    // Pour les paramètres, permettre l'accès avec ancien mot de passe pour migration
    if (!salonSettings.stats_password.startsWith('$2')) {
      console.log('Plain text password detected, checking direct match');
      // Vérification simple pour ancien mot de passe en texte brut
      if (inputPassword === salonSettings.stats_password) {
        console.log('Plain text password match - granting temporary access');
        toast({
          title: "⚠️ Accès temporaire accordé",
          description: "Veuillez définir un nouveau mot de passe sécurisé immédiatement.",
          variant: "destructive",
        });
        return true; // Accès temporaire pour migration
      } else {
        console.log('Plain text password mismatch');
        toast({
          title: "❌ Mot de passe incorrect",
          description: "Mot de passe invalide.",
          variant: "destructive",
        });
        return false;
      }
    }

    try {
      console.log('Calling verify_password RPC for settings');
      const {
        data,
        error
      } = await supabase.rpc('verify_password', {
        password_text: inputPassword,
        password_hash: salonSettings.stats_password
      });
      
      console.log('Settings RPC result:', { data, error });
      
      if (error) {
        console.error('Password verification error:', error);
        return false;
      }
      return data === true;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  };
  
  // Fonction de vérification de mot de passe pour les rapports (utilise le même mot de passe)
  const verifyReportsPassword = async (inputPassword: string): Promise<boolean> => {
    console.log('verifyReportsPassword called with:', { 
      inputPassword: inputPassword?.length > 0 ? '[PASSWORD PROVIDED]' : '[NO PASSWORD]',
      salonSettings: salonSettings ? 'LOADED' : 'NOT LOADED',
      hasStatsPassword: !!salonSettings?.stats_password,
      statsPasswordType: salonSettings?.stats_password?.startsWith('$2') ? 'HASHED' : 'PLAIN_TEXT'
    });

    if (!salonSettings?.stats_password) {
      console.log('No password configured for reports');
      toast({
        title: "❌ Aucun mot de passe configuré",
        description: "Définissez un mot de passe sécurisé dans les paramètres.",
        variant: "destructive",
      });
      return false; // No access without password
    }

    // Pour les rapports, permettre l'accès avec ancien mot de passe pour migration
    if (!salonSettings.stats_password.startsWith('$2')) {
      console.log('Plain text password detected for reports, checking direct match');
      // Vérification simple pour ancien mot de passe en texte brut
      if (inputPassword === salonSettings.stats_password) {
        console.log('Plain text password match - granting temporary access to reports');
        toast({
          title: "⚠️ Accès temporaire accordé",
          description: "Veuillez définir un nouveau mot de passe sécurisé dans les paramètres.",
          variant: "destructive",
        });
        return true; // Accès temporaire pour migration
      } else {
        console.log('Plain text password mismatch for reports');
        toast({
          title: "❌ Mot de passe incorrect",
          description: "Mot de passe invalide.",
          variant: "destructive",
        });
        return false;
      }
    }

    try {
      console.log('Calling verify_password RPC for reports');
      const {
        data,
        error
      } = await supabase.rpc('verify_password', {
        password_text: inputPassword,
        password_hash: salonSettings.stats_password
      });
      
      console.log('Reports RPC result:', { data, error });
      
      if (error) {
        console.error('Password verification error:', error);
        return false;
      }
      return data === true;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  };

  const handleViewChange = (view: string) => {
    // Sections protégées : Stats, Rapports, Paramètres
    const protectedSections = ['stats', 'settings', 'reports'];
    
    if (protectedSections.includes(view)) {
      // Si un mot de passe est configuré, vérifier l'accès
      if (salonSettings?.stats_password) {
        // Vérifier si la section est déjà déverrouillée
        const isUnlocked = {
          'stats': isStatsUnlocked,
          'settings': isSettingsUnlocked, 
          'reports': isReportsUnlocked
        }[view];
        
        if (!isUnlocked) {
          // Afficher le modal de mot de passe approprié
          if (view === 'stats') setShowStatsPasswordModal(true);
          if (view === 'settings') setShowSettingsPasswordModal(true);
          if (view === 'reports') setShowReportsPasswordModal(true);
          return;
        }
      }
      // Si aucun mot de passe configuré, accès libre aux sections
    }
    
    setCurrentView(view);
  };
  const handleStatsPasswordSuccess = () => {
    setIsStatsUnlocked(true);
    setShowStatsPasswordModal(false);
    setCurrentView('stats');
  };
  const handleSettingsPasswordSuccess = () => {
    setIsSettingsUnlocked(true);
    setShowSettingsPasswordModal(false);
    setCurrentView('settings');
  };
  const handleReportsPasswordSuccess = () => {
    setIsReportsUnlocked(true);
    setShowReportsPasswordModal(false);
    setCurrentView('reports');
  };
  const addToCart = (service: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === service.id);
      if (existing) {
        return prev.map(item => item.id === service.id ? {
          ...item,
          quantity: item.quantity + 1
        } : item);
      }
      return [...prev, {
        id: service.id,
        name: service.name,
        price: service.price,
        duration: service.duration,
        quantity: 1
      }];
    });
  };
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems(prev => prev.map(item => item.id === id ? {
      ...item,
      quantity
    } : item));
  };
  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };
  const handleCheckout = async (method: 'cash' | 'card') => {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    try {
      // Enregistrer la transaction dans Supabase
      await addTransaction({
        items: cartItems,
        totalAmount: total,
        paymentMethod: method
      });

      // Clear cart after successful payment
      setCartItems([]);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la transaction",
        variant: "destructive"
      });
    }
  };

  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-primary font-dancing">
                    L'app du salon
                  </h1>
                  {!isMobile && <p className="text-sm text-muted-foreground">
                      {new Date().toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                    </p>}
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <SubscriptionBadge onUpgrade={() => setCurrentView('subscription')} />
                {currentView === "pos" && isMobile && <Button variant="outline" size="sm" onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
                    <ShoppingCart className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                    <span className="text-xs">{cartItems.length}</span>
                  </Button>}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/historique')} 
                  className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <History className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                  {!isMobile && "Historique"}
                </Button>
                {user?.email === 'dylan.cecius@gmail.com' && (
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
                    <User className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                    {!isMobile && "Admin"}
                  </Button>
                )}
                {!isMobile && <div className="text-right">
                    <p className="text-sm text-muted-foreground">Connecté en tant que:</p>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>}
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={signOut} className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
                  <LogOut className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                  {!isMobile && "Déconnexion"}
                </Button>
              </div>
            </div>
          </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Security Alert */}
        <SecurityAlert />
        
        <Tabs value={currentView} onValueChange={handleViewChange} className="space-y-4 sm:space-y-6">
          <TabsList className={cn("grid w-full bg-card", isMobile ? "grid-cols-4 max-w-full" : "grid-cols-7 max-w-5xl")}>
            <TabsTrigger value="pos" className="flex items-center gap-1 sm:gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
              <Scissors className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
              {isMobile ? "POS" : "Encaissement"}
            </TabsTrigger>
            <TabsTrigger value="agenda" className="flex items-center gap-1 sm:gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
              <Calendar className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1 sm:gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
              <BarChart3 className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-1 sm:gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
              <Crown className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
              {isMobile ? "Pro" : "Abonnement"}
            </TabsTrigger>
            {!isMobile && <>
                <TabsTrigger value="todo" className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
                  <CheckSquare className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                  To-Do List
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
                  <Mail className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                  Rapports
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
                  <SettingsIcon className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                  Paramètres
                </TabsTrigger>
              </>}
          </TabsList>
          
          {/* Menu mobile pour les onglets supplémentaires */}
          {isMobile && <div className="flex gap-2 overflow-x-auto pb-2">
              <Button variant={currentView === "todo" ? "default" : "outline"} size="sm" onClick={() => handleViewChange("todo")} className="flex items-center gap-2 min-w-fit hover:scale-105 active:scale-95 transition-all duration-200">
                <CheckSquare className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                To-Do
              </Button>
              <Button variant={currentView === "reports" ? "default" : "outline"} size="sm" onClick={() => handleViewChange("reports")} className="flex items-center gap-2 min-w-fit hover:scale-105 active:scale-95 transition-all duration-200">
                <Mail className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                Rapports
              </Button>
              <Button variant={currentView === "settings" ? "default" : "outline"} size="sm" onClick={() => handleViewChange("settings")} className="flex items-center gap-2 min-w-fit hover:scale-105 active:scale-95 transition-all duration-200">
                <SettingsIcon className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                Paramètres
              </Button>
            </div>}

          <TabsContent value="pos">
            <div className={cn("gap-4 sm:gap-6", isMobile ? "space-y-6" : "grid grid-cols-1 xl:grid-cols-3")}>
              {/* Services Section */}
              <div className={cn(isMobile ? "space-y-4" : "xl:col-span-2 space-y-6")}>
                {servicesLoading ? <div className="space-y-4">
                    {[...Array(3)].map((_, i) => <div key={i} className="animate-pulse">
                        <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[...Array(3)].map((_, j) => <div key={j} className="h-32 bg-muted rounded"></div>)}
                        </div>
                      </div>)}
                  </div> : categories.map(category => {
                const categoryServices = services.filter(service => service.category === category.id);
                if (categoryServices.length === 0) return null;
                return <div key={category.id}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-primary">{category.name}</h3>
                           <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">
                             {categoryServices.length} {category.id === 'produit' ? 'produit' : 'service'}{categoryServices.length > 1 ? 's' : ''}
                           </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryServices.map(service => <ServiceCard key={service.id} service={service as any} onAdd={addToCart} />)}
                        </div>
                      </div>;
              })}
                
                {!servicesLoading && services.length === 0 && <div className="text-center py-12">
                    <div className="text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun service configuré</p>
                      <p className="text-sm">Ajoutez vos services dans l'onglet Paramètres</p>
                    </div>
                  </div>}
              </div>

              {/* Cart Sidebar - Desktop and Tablet */}
              {!isMobile && <div className="xl:col-span-1">
                  <div className="sticky top-24">
                    <CartSidebar items={cartItems} onUpdateQuantity={updateQuantity} onRemoveItem={removeFromCart} onCheckout={handleCheckout} />
                  </div>
                </div>}
            </div>
          </TabsContent>

          <TabsContent value="agenda">
            <AppleCalendar />
          </TabsContent>

          <TabsContent value="todo">
            <TodoList />
          </TabsContent>

          <TabsContent value="stats">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Statistiques & Analyses</h2>
                <Button onClick={() => setIsTransactionsManagerOpen(true)} variant="outline" className="flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200">
                  <DollarSign className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
                  Gérer les encaissements
                </Button>
              </div>

              {/* Raccourcis de navigation */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 text-sm text-muted-foreground">ACCÈS RAPIDE</h3>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('stats-overview')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-xs"
                  >
                    Vue d'ensemble
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('custom-date-range')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-xs bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                  >
                    CA période personnalisée
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('barber-performance')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-xs"
                  >
                    Performance coiffeurs
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('peak-hours')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-xs"
                  >
                    Heures de pointe
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('service-profitability')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-xs"
                  >
                    Rentabilité services
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => document.getElementById('occupancy-rate')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-xs"
                  >
                    Taux d'occupation
                  </Button>
                </div>
              </Card>
              
              <div id="stats-overview">
                <StatsOverview stats={stats} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PaymentMethodStats paymentStats={stats.paymentStats} />
                <FeatureGate 
                  requiredFeature="canAccessAdvancedStats"
                  onUpgrade={() => setCurrentView('subscription')}
                >
                  <ClientRetentionStats />
                </FeatureGate>
              </div>
              
              <CustomPaymentStats />
              
              <RevenueChart />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div id="custom-date-range">
                  <CustomDateRangeStats />
                </div>
                <FeatureGate 
                  requiredFeature="canAccessAdvancedStats"
                  onUpgrade={() => setCurrentView('subscription')}
                >
                  <CancellationRateStats />
                </FeatureGate>
              </div>
              
              <FeatureGate 
                requiredFeature="canAccessAdvancedStats"
                onUpgrade={() => setCurrentView('subscription')}
              >
                <div id="barber-performance">
                  <BarberPerformanceStats />
                </div>
              </FeatureGate>
              
              <FeatureGate 
                requiredFeature="canAccessAdvancedStats"
                onUpgrade={() => setCurrentView('subscription')}
              >
                <div id="peak-hours">
                  <PeakHoursStats />
                </div>
              </FeatureGate>
              
              <FeatureGate 
                requiredFeature="canAccessAdvancedStats"
                onUpgrade={() => setCurrentView('subscription')}
              >
                <ServiceProfitabilityStats />
              </FeatureGate>
              
              <FeatureGate 
                requiredFeature="canAccessAdvancedStats"
                onUpgrade={() => setCurrentView('subscription')}
              >
                <div id="occupancy-rate">
                  <OccupancyRateStats />
                </div>
              </FeatureGate>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-6">
              <AutomatedReports />
              <EmailReports statsData={stats} />
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <Settings />
          </TabsContent>
          
          <TabsContent value="subscription">
            <div className="space-y-6">
              <SubscriptionManagement />
            </div>
          </TabsContent>
        </Tabs>

        <StatsPasswordModal isOpen={showStatsPasswordModal} onClose={() => setShowStatsPasswordModal(false)} onSuccess={handleStatsPasswordSuccess} onVerifyPassword={verifyStatsPassword} />

        <StatsPasswordModal isOpen={showSettingsPasswordModal} onClose={() => setShowSettingsPasswordModal(false)} onSuccess={handleSettingsPasswordSuccess} onVerifyPassword={verifySettingsPassword} />

        <StatsPasswordModal isOpen={showReportsPasswordModal} onClose={() => setShowReportsPasswordModal(false)} onSuccess={handleReportsPasswordSuccess} onVerifyPassword={verifyReportsPassword} />
      </div>

      <TransactionsManager isOpen={isTransactionsManagerOpen} onClose={() => setIsTransactionsManagerOpen(false)} />

      {/* Mobile Cart Drawer */}
      {isMobile && <Drawer open={isCartOpen} onOpenChange={setIsCartOpen}>
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle>Panier</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <CartSidebar items={cartItems} onUpdateQuantity={updateQuantity} onRemoveItem={removeFromCart} onCheckout={method => {
            handleCheckout(method);
            setIsCartOpen(false);
          }} />
            </div>
          </DrawerContent>
        </Drawer>}
    </div>;
};

export default Index;
