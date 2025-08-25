import { useState } from "react";
import { BarChart3, ShoppingCart, Scissors, Calendar, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceCard from "@/components/ServiceCard";
import CartSidebar from "@/components/CartSidebar";
import StatsOverview from "@/components/StatsOverview";
import BlockCalendar from "@/components/BlockCalendar";
import EmailReports from "@/components/EmailReports";
import { services, getAllCategories } from "@/data/services";
import { toast } from "@/hooks/use-toast";
import { useSupabaseTransactions } from "@/hooks/useSupabaseTransactions";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const Index = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState("pos");
  const { addTransaction, getStats } = useSupabaseTransactions();
  
  // Get real stats from transactions
  const stats = getStats();

  const categories = getAllCategories();

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
      return [...prev, { ...service, quantity: 1 }];
    });
    
    toast({
      title: "Service ajouté",
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
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent rounded-lg">
                <Scissors className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">SalonPOS</h1>
                <p className="text-sm text-muted-foreground">Coiffure & Barbier</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground ml-2">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-card">
            <TabsTrigger value="pos" className="flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              POS
            </TabsTrigger>
            <TabsTrigger value="agenda" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Rapports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pos">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Services Section */}
              <div className="lg:col-span-2 space-y-6">
                {categories.map((category) => {
                  const categoryServices = services.filter(s => s.category === category);
                  if (categoryServices.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-4">
                      <h2 className="text-xl font-semibold text-primary capitalize flex items-center gap-2">
                        {category === 'coupe' && <Scissors className="h-5 w-5" />}
                        {category === 'barbe' && <div className="h-5 w-5 bg-accent rounded" />}
                        {category === 'combo' && <div className="h-5 w-5 bg-pos-card rounded-lg" />}
                        {category === 'produit' && <div className="h-5 w-5 bg-pos-success rounded-full" />}
                        {category}s
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categoryServices.map((service) => (
                          <ServiceCard 
                            key={service.id} 
                            service={service} 
                            onAdd={addToCart}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <CartSidebar
                    items={cartItems}
                    onUpdateQuantity={updateQuantity}
                    onRemoveItem={removeFromCart}
                    onCheckout={handleCheckout}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="agenda">
            <BlockCalendar />
          </TabsContent>

          <TabsContent value="stats">
            <div className="space-y-6">
              <StatsOverview stats={stats} />
              
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
        </Tabs>
      </div>
    </div>
  );
};

export default Index;