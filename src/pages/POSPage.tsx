import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import ServiceCard from '@/components/ServiceCard';
import CartSidebar from '@/components/CartSidebar';
import MainLayout from '@/components/MainLayout';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

interface CartItem {
  id: string;
  name: string;
  price: number;
  duration: number;
  quantity: number;
}

const POSPage = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const { services, loading: servicesLoading, categories } = useSupabaseServices();
  const { addTransaction } = useTransactions();
  const isMobile = useIsMobile();

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
      return [
        ...prev,
        {
          id: service.id,
          name: service.name,
          price: service.price,
          duration: service.duration,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems(prev =>
      prev.map(item => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = async (method: 'cash' | 'card', clientId?: string) => {
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    try {
      await addTransaction({
        items: cartItems,
        totalAmount: total,
        paymentMethod: method,
        clientId,
      });

      setCartItems([]);
      setIsCartOpen(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: "Impossible d'enregistrer la transaction",
        variant: 'destructive',
      });
    }
  };

  return (
    <MainLayout 
      cartItemsCount={cartItems.length} 
      onCartOpen={() => setIsCartOpen(true)}
    >
      <div className={cn("gap-4 sm:gap-6", isMobile ? "space-y-6" : "grid grid-cols-1 xl:grid-cols-3")}>
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
            categories.map(category => {
              const categoryServices = services.filter(
                service => service.category === category.id
              );
              if (categoryServices.length === 0) return null;
              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-primary">
                      {category.name}
                    </h3>
                    <Badge variant="secondary" className="bg-accent/10 text-accent-foreground">
                      {categoryServices.length}{' '}
                      {category.id === 'produit' ? 'produit' : 'service'}
                      {categoryServices.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryServices.map(service => (
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
                <p className="text-sm">
                  Ajoutez vos services dans l'onglet Paramètres
                </p>
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
                onCheckout={method => {
                  handleCheckout(method);
                  setIsCartOpen(false);
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </MainLayout>
  );
};

export default POSPage;
