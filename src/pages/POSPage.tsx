import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Euro, Receipt, Scissors, ClipboardList, Plus, Package, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTransactions } from '@/contexts/TransactionsContext';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { useStocks } from '@/hooks/useStocks';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import ServiceCard from '@/components/ServiceCard';
import CartSidebar from '@/components/CartSidebar';
import MainLayout from '@/components/MainLayout';
import TransactionsManager from '@/components/TransactionsManager';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [catalogTab, setCatalogTab] = useState<'services' | 'products'>('services');
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', duration: '30', category: 'coupe' });
  const [productForm, setProductForm] = useState({ name: '', price: '', category: 'produit' });
  const { toast } = useToast();
  const { services, loading: servicesLoading, categories, addService, fetchServices } = useSupabaseServices();
  const { createProduct } = useStocks();
  const { addTransaction, transactions } = useTransactions();
  const isMobile = useIsMobile();

  const todayStats = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTx = transactions.filter(tx => new Date(tx.transactionDate) >= startOfToday);
    const totalAmount = todayTx.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const totalServices = todayTx.reduce((sum, tx) => {
      const items = tx.items as any[];
      return sum + (items?.reduce((s: number, i: any) => s + (i.quantity || 1), 0) || 0);
    }, 0);
    return { totalAmount, txCount: todayTx.length, servicesCount: totalServices };
  }, [transactions]);

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

  const handleCheckout = async (method: 'cash' | 'card', staffId?: string) => {
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    try {
      await addTransaction({
        items: cartItems,
        totalAmount: total,
        paymentMethod: method,
        staffId,
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

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) return;
    try {
      await addService({
        name: serviceForm.name.trim(),
        price: parseFloat(serviceForm.price) || 0,
        duration: parseInt(serviceForm.duration) || 30,
        category: serviceForm.category,
        appointmentBuffer: 0,
        isActive: true,
        displayOrder: 0,
        color: '#6B7280',
      });
      toast({ title: 'Succès', description: 'Service ajouté avec succès' });
      setServiceForm({ name: '', price: '', duration: '30', category: 'coupe' });
      setIsAddServiceOpen(false);
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'ajouter le service", variant: 'destructive' });
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;
    try {
      await addService({
        name: productForm.name.trim(),
        price: parseFloat(productForm.price) || 0,
        duration: 0,
        category: 'produit',
        appointmentBuffer: 0,
        isActive: true,
        displayOrder: 0,
        color: '#10B981',
      });
      toast({ title: 'Succès', description: 'Produit ajouté avec succès' });
      setProductForm({ name: '', price: '', category: 'produit' });
      setIsAddProductOpen(false);
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'ajouter le produit", variant: 'destructive' });
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const formatPrice = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(2)} €`;
  const mobileGroups = categories
    .filter(category => (catalogTab === 'products') === (category.id === 'produit'))
    .map(category => ({ category, items: services.filter(service => service.category === category.id) }))
    .filter(group => group.items.length > 0);

  return (
    <MainLayout
      cartItemsCount={cartCount}
      onCartOpen={isMobile ? undefined : () => setIsCartOpen(true)}
    >
      {/* Caisse mobile */}
      {isMobile && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {todayStats.totalAmount.toFixed(0)} € encaissés aujourd'hui · {todayStats.txCount} {todayStats.txCount > 1 ? 'transactions' : 'transaction'}
            </p>
            <h1 className="text-[26px] font-bold leading-tight text-foreground">Caisse</h1>
          </div>

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <button
              type="button"
              onClick={() => setIsAddServiceOpen(true)}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground active:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Service
            </button>
            <button
              type="button"
              onClick={() => setIsAddProductOpen(true)}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground active:bg-muted"
            >
              <Plus className="h-4 w-4" />
              Produit
            </button>
            <button
              type="button"
              onClick={() => setIsTransactionsOpen(true)}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground active:bg-muted"
            >
              <ClipboardList className="h-4 w-4" />
              Encaissements
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            {([['services', 'Services'], ['products', 'Produits']] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCatalogTab(id)}
                aria-pressed={catalogTab === id}
                className={cn(
                  'h-11 rounded-xl text-sm font-semibold transition-colors',
                  catalogTab === id ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {servicesLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-[104px] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : mobileGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
              <p className="text-[15px] font-semibold text-foreground">
                {catalogTab === 'products' ? 'Aucun produit' : 'Aucun service'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajoutez-en un avec le bouton {catalogTab === 'products' ? 'Produit' : 'Service'} ci-dessus.
              </p>
            </div>
          ) : (
            mobileGroups.map(({ category, items }) => (
              <div key={category.id} className="space-y-2">
                {catalogTab === 'services' && (
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {category.name}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {items.map(service => {
                    const qty = cartItems.find(item => item.id === service.id)?.quantity || 0;
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => addToCart(service)}
                        className={cn(
                          'relative flex min-h-[104px] flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition-colors active:bg-muted',
                          qty > 0 ? 'border-primary bg-accent' : 'border-border bg-card'
                        )}
                      >
                        <span className="line-clamp-2 pr-7 text-sm font-semibold leading-snug text-foreground">
                          {service.name}
                        </span>
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-lg font-bold text-foreground">{formatPrice(service.price)}</span>
                          {service.duration > 0 && (
                            <span className="text-xs text-muted-foreground">{service.duration} min</span>
                          )}
                        </span>
                        {qty > 0 && (
                          <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                            {qty}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {cartCount > 0 && <div className="h-16" aria-hidden="true" />}
        </div>
      )}

      {/* Barre panier mobile */}
      {isMobile && cartCount > 0 && !isCartOpen && (
        <div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-30 bg-background/95 px-4 pb-3 pt-2 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex h-14 w-full items-center justify-between rounded-2xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground active:opacity-90"
          >
            <span>{cartCount} {cartCount > 1 ? 'articles' : 'article'}</span>
            <span className="flex items-center gap-2">
              Encaisser {formatPrice(cartTotal)}
              <ChevronRight className="h-[18px] w-[18px]" />
            </span>
          </button>
        </div>
      )}

      {/* Header with action buttons */}
      <div className="hidden md:flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddServiceOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter un service
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddProductOpen(true)}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Ajouter un produit
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsTransactionsOpen(true)}
          className="gap-2"
        >
          <ClipboardList className="h-4 w-4" />
          Gérer les encaissements
        </Button>
      </div>

      {/* Session Summary Bar */}
      <div className="hidden md:grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="p-2 rounded-lg bg-green-500/20 hidden sm:block">
            <Euro className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-sm sm:text-xl font-bold text-green-600">{todayStats.totalAmount.toFixed(0)}€</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Encaissé</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl bg-primary/10 border border-primary/20">
          <div className="p-2 rounded-lg bg-primary/20 hidden sm:block">
            <Receipt className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm sm:text-xl font-bold text-primary">{todayStats.txCount}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Transactions</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl bg-accent/10 border border-accent/20">
          <div className="p-2 rounded-lg bg-accent/20 hidden sm:block">
            <Scissors className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <p className="text-sm sm:text-xl font-bold text-accent-foreground">{todayStats.servicesCount}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Services</p>
          </div>
        </div>
      </div>

      <div className={cn("gap-4 sm:gap-6", isMobile ? "hidden" : "grid grid-cols-1 md:grid-cols-3")}>
        {/* Services Section */}
        <div className={cn(isMobile ? "space-y-4" : "md:col-span-2 space-y-6")}>
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
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
          <div className="md:col-span-1">
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
                onCheckout={(method, staffId) => {
                  handleCheckout(method, staffId);
                  setIsCartOpen(false);
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
      {/* Transactions Manager Modal */}
      <TransactionsManager
        isOpen={isTransactionsOpen}
        onClose={() => setIsTransactionsOpen(false)}
      />

      {/* Add Service Modal */}
      <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un service</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddService} className="space-y-4">
            <div>
              <Label>Nom du service *</Label>
              <Input value={serviceForm.name} onChange={e => setServiceForm({...serviceForm, name: e.target.value})} placeholder="Ex: Coupe homme" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prix (€) *</Label>
                <Input type="number" step="0.01" min="0" value={serviceForm.price} onChange={e => setServiceForm({...serviceForm, price: e.target.value})} placeholder="25" required />
              </div>
              <div>
                <Label>Durée (min)</Label>
                <Input type="number" min="5" step="5" value={serviceForm.duration} onChange={e => setServiceForm({...serviceForm, duration: e.target.value})} />
              </div>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={serviceForm.category} onValueChange={v => setServiceForm({...serviceForm, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coupe">Coupe</SelectItem>
                  <SelectItem value="barbe">Barbe</SelectItem>
                  <SelectItem value="combo">Formule</SelectItem>
                  <SelectItem value="soin">Soin</SelectItem>
                  <SelectItem value="couleur">Couleur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddServiceOpen(false)} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1">Ajouter</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Product Modal */}
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un produit</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div>
              <Label>Nom du produit *</Label>
              <Input value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="Ex: Gel coiffant" required />
            </div>
            <div>
              <Label>Prix de vente (€) *</Label>
              <Input type="number" step="0.01" min="0" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} placeholder="15" required />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddProductOpen(false)} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1">Ajouter</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default POSPage;
