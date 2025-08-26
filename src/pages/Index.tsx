import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ShoppingCart, Calendar, CheckSquare, BarChart3, FileText, Settings as SettingsIcon, User, LogOut, Scissors, DollarSign, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ServiceCard from '@/components/ServiceCard';
import CartSidebar from '@/components/CartSidebar';
import BlockCalendar from '@/components/BlockCalendar';
import TodoList from '@/components/TodoList';
import StatsOverview from '@/components/StatsOverview';
import PaymentMethodStats from '@/components/PaymentMethodStats';
import CustomDateRangeStats from '@/components/CustomDateRangeStats';
import EmailReports from '@/components/EmailReports';
import Settings from '@/components/Settings';
import StatsPasswordModal from '@/components/StatsPasswordModal';
import TransactionsManager from '@/components/TransactionsManager';

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
  const [isStatsUnlocked, setIsStatsUnlocked] = useState(false);
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const [isTransactionsManagerOpen, setIsTransactionsManagerOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { salonSettings } = useSupabaseSettings();
  const { services, loading: servicesLoading, categories } = useSupabaseServices();
  const { addTransaction, getStats } = useSupabaseTransactions();
  const isMobile = useIsMobile();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Show loading while checking authentication
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

  // Don't render if not authenticated
  if (!user) {
    return null;
  }
  
  // Get real stats from transactions
  const stats = getStats();

  // Secure password verification functions
  const verifyStatsPassword = async (inputPassword: string): Promise<boolean> => {
    if (!salonSettings?.stats_password) {
      toast({
        title: "Configuration manquante",
        description: "Aucun mot de passe n'est défini pour l'accès aux statistiques. Configurez-le dans les paramètres.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('verify_password', {
        password_text: inputPassword,
        password_hash: salonSettings.stats_password
      });

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
    if (!salonSettings?.stats_password) {
      toast({
        title: "Configuration manquante", 
        description: "Aucun mot de passe n'est défini pour l'accès aux paramètres. Configurez-le dans les paramètres.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('verify_password', {
        password_text: inputPassword,
        password_hash: salonSettings.stats_password
      });

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
    // Toujours demander le mot de passe pour les stats et paramètres
    if (view === 'stats' && !isStatsUnlocked) {
      setShowStatsPasswordModal(true);
      return;
    }
    if (view === 'settings' && !isSettingsUnlocked) {
      setShowSettingsPasswordModal(true);
      return;
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

  const addToCart = (service: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === service.id);
      if (existing) {
        return prev.map(item =>
          item.id === service.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { 
        id: service.id,
        name: service.name,
        price: service.price,
        duration: service.duration,
        quantity: 1 
      }];
    });
    
    toast({
      title: service.category === 'produit' ? "Produit ajouté" : "Service ajouté",
      description: `${service.name} ajouté au panier`,
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = async (method: 'cash' | 'card') => {
    const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    try {
      // Enregistrer la transaction dans Supabase
      await addTransaction({
        items: cartItems,
        totalAmount: total,
        paymentMethod: method
      });

      // Deep link vers Belfius Mobile pour les paiements Bancontact
      if (method === 'card') {
        const belfiusUrl = 'belfius://';
        window.open(belfiusUrl, '_blank');
        
        // Fallback vers l'app store si l'app n'est pas installée
        setTimeout(() => {
          if (document.hasFocus()) {
            const playStoreUrl = 'https://play.google.com/store/apps/details?id=be.belfius.directmobile.android';
            const appStoreUrl = 'https://apps.apple.com/be/app/belfius-mobile/id516419482';
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            window.open(isIOS ? appStoreUrl : playStoreUrl, '_blank');
          }
        }, 1000);
      }
      
      toast({
        title: "Paiement confirmé",
        description: `Paiement de ${total.toFixed(2)}€ par ${method === 'cash' ? 'espèces' : 'Bancontact'}`,
      });
      
      // Clear cart after successful payment
      setTimeout(() => {
        setCartItems([]);
      }, 1500);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la transaction",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {salonSettings?.logo_url ? (
                  <img 
                    src={salonSettings.logo_url} 
                    alt="Logo du salon" 
                    className="h-8 w-8 sm:h-10 sm:w-10 object-cover rounded-lg"
                  />
                ) : (
                  <div className="p-2 bg-accent rounded-lg">
                    <Scissors className="h-4 w-4 sm:h-6 sm:w-6 text-accent-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-primary">
                    {salonSettings?.name || 'SalonPOS'}
                  </h1>
                  {!isMobile && (
                    <p className="text-sm text-muted-foreground">
                      {new Date().toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                {currentView === "pos" && isMobile && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsCartOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span className="text-xs">{cartItems.length}</span>
                  </Button>
                )}
                {!isMobile && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Connecté en tant que:</p>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={signOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {!isMobile && "Déconnexion"}
                </Button>
              </div>
            </div>
          </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <Tabs value={currentView} onValueChange={handleViewChange} className="space-y-4 sm:space-y-6">
          <TabsList className={cn(
            "grid w-full bg-card",
            isMobile ? "grid-cols-3 max-w-full" : "grid-cols-6 max-w-4xl"
          )}>
            <TabsTrigger value="pos" className="flex items-center gap-1 sm:gap-2">
              <Scissors className="h-4 w-4" />
              {isMobile ? "Encaissement" : "Encaissement"}
            </TabsTrigger>
            <TabsTrigger value="agenda" className="flex items-center gap-1 sm:gap-2">
              <Calendar className="h-4 w-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1 sm:gap-2">
              <BarChart3 className="h-4 w-4" />
              Stats
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="todo" className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  To-Do List
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Rapports
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  Paramètres
                </TabsTrigger>
              </>
            )}
          </TabsList>
          
          {/* Menu mobile pour les onglets supplémentaires */}
          {isMobile && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={currentView === "todo" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewChange("todo")}
                className="flex items-center gap-2 min-w-fit"
              >
                <CheckSquare className="h-4 w-4" />
                To-Do
              </Button>
              <Button
                variant={currentView === "reports" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewChange("reports")}
                className="flex items-center gap-2 min-w-fit"
              >
                <Mail className="h-4 w-4" />
                Rapports
              </Button>
              <Button
                variant={currentView === "settings" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewChange("settings")}
                className="flex items-center gap-2 min-w-fit"
              >
                <SettingsIcon className="h-4 w-4" />
                Paramètres
              </Button>
            </div>
          )}

          <TabsContent value="pos">
            <div className={cn(
              "gap-4 sm:gap-6",
              isMobile ? "space-y-6" : "grid grid-cols-1 xl:grid-cols-3"
            )}>
              {/* Services Section */}
              <div className={cn(isMobile ? "space-y-4" : "xl:col-span-2 space-y-6")}>
                {servicesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-6 bg-muted rounded w-1/4 mb-4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {[...Array(3)].map((_, j) => (
                            <div key={j} className="h-32 bg-muted rounded"></div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  categories.map((category) => {
                    const categoryServices = services.filter(service => service.category === category.id);
                    if (categoryServices.length === 0) return null;
                    
                    return (
                      <div key={category.id}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-primary">{category.name}</h3>
                           <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">
                             {categoryServices.length} {category.id === 'produit' ? 'produit' : 'service'}{categoryServices.length > 1 ? 's' : ''}
                           </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryServices.map((service) => (
                          <ServiceCard 
                            key={service.id}
                            service={service as any}
                            onAdd={addToCart}
                          />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
                
                {!servicesLoading && services.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucun service configuré</p>
                      <p className="text-sm">Ajoutez vos services dans l'onglet Paramètres</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Sidebar - Desktop and Tablet */}
              {!isMobile && (
                <div className="xl:col-span-1">
                  <div className="sticky top-24">
                    <CartSidebar
                      items={cartItems}
                      onUpdateQuantity={updateQuantity}
                      onRemoveItem={removeFromCart}
                      onCheckout={handleCheckout}
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="agenda">
            <BlockCalendar />
          </TabsContent>

          <TabsContent value="todo">
            <TodoList />
          </TabsContent>

          <TabsContent value="stats">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Statistiques & Analyses</h2>
                <Button 
                  onClick={() => setIsTransactionsManagerOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Gérer les encaissements
                </Button>
              </div>
              
              <StatsOverview stats={stats} />
              
              <PaymentMethodStats paymentStats={stats.paymentStats} />
              
              <CustomDateRangeStats />
              
              <Card className="p-6 bg-gradient-to-br from-card to-background">
                <div className="text-center text-muted-foreground py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Graphiques détaillés bientôt disponibles</h3>
                  <p>Analytics avancées en cours de développement</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <EmailReports statsData={stats} />
          </TabsContent>
          
          <TabsContent value="settings">
            <Settings />
          </TabsContent>
        </Tabs>

        <StatsPasswordModal
          isOpen={showStatsPasswordModal}
          onClose={() => setShowStatsPasswordModal(false)}
          onSuccess={handleStatsPasswordSuccess}
          onVerifyPassword={verifyStatsPassword}
        />

        <StatsPasswordModal
          isOpen={showSettingsPasswordModal}
          onClose={() => setShowSettingsPasswordModal(false)}
          onSuccess={handleSettingsPasswordSuccess}
          onVerifyPassword={verifySettingsPassword}
        />
      </div>

      <TransactionsManager 
        isOpen={isTransactionsManagerOpen}
        onClose={() => setIsTransactionsManagerOpen(false)}
      />

      {/* Mobile Cart Drawer */}
      {isMobile && (
        <Drawer open={isCartOpen} onOpenChange={setIsCartOpen}>
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle>Panier</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <CartSidebar
                items={cartItems}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeFromCart}
                onCheckout={(method) => {
                  handleCheckout(method);
                  setIsCartOpen(false);
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
};

export default Index;