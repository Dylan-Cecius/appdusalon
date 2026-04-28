import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Euro, Receipt, Scissors, ClipboardList, Plus, Package, History } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';

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
    const avgBasket = todayTx.length > 0 ? totalAmount / todayTx.length : 0;
    return { totalAmount, txCount: todayTx.length, servicesCount: totalServices, avgBasket };
  }, [transactions]);

  const addToCart = (service: any) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === service.id);
      if (existing) {
        return prev.map(item =>
          item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        { id: service.id, name: service.name, price: service.price, duration: service.duration, quantity: 1 },
      ];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(id); return; }
    setCartItems(prev => prev.map(item => (item.id === id ? { ...item, quantity } : item)));
  };

  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = async (method: 'cash' | 'card', staffId?: string) => {
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    try {
      await addTransaction({ items: cartItems, totalAmount: total, paymentMethod: method, staffId });
      setCartItems([]);
      setIsCartOpen(false);
    } catch (error) {
      toast({ title: 'Erreur', description: "Impossible d'enregistrer la transaction", variant: 'destructive' });
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

  return (
    <MainLayout cartItemsCount={cartItems.length} onCartOpen={() => setIsCartOpen(true)}>
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col gap-3 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">
              Encaissement <span className="font-serif italic text-primary">— caisse</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sélectionnez les prestations puis encaissez · {cartItems.length} article{cartItems.length > 1 ? 's' : ''} en cours
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsTransactionsOpen(true)} className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Encaissements</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsAddServiceOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Service
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsAddProductOpen(true)} className="gap-2">
              <Package className="h-4 w-4" />
              Produit
            </Button>
          </div>
        </div>

        {/* Hero stat: encaissé aujourd'hui */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-widest opacity-70">Encaissé aujourd'hui</div>
              <div className="mt-2 flex items-baseline gap-1 text-5xl font-medium tracking-tight leading-none">
                {todayStats.totalAmount.toFixed(0)}<span className="font-serif italic text-3xl">€</span>
              </div>
              <div className="mt-3 font-mono text-[11px] uppercase tracking-widest opacity-70">
                Panier moyen · <span className="font-sans normal-case tracking-normal text-sm font-medium opacity-100">{todayStats.avgBasket.toFixed(2).replace('.', ',')} €</span>
              </div>
            </div>
            <div className="flex gap-6 text-right text-sm opacity-90">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">Transactions</div>
                <div className="mt-1 text-2xl font-semibold">{todayStats.txCount}</div>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest opacity-70">Services</div>
                <div className="mt-1 text-2xl font-semibold">{todayStats.servicesCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className={cn('gap-4 sm:gap-6', isMobile ? 'space-y-6' : 'grid grid-cols-1 md:grid-cols-3')}>
          {/* Services Section */}
          <div className={cn(isMobile ? 'space-y-4' : 'md:col-span-2 space-y-6')}>
            {servicesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="mb-4 h-5 w-1/4 rounded bg-muted"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="h-32 rounded-lg bg-muted"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              categories.map(category => {
                const categoryServices = services.filter(service => service.category === category.id);
                if (categoryServices.length === 0) return null;
                return (
                  <div key={category.id}>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                        {category.name}
                      </h3>
                      <Badge variant="secondary" className="bg-primary/15 text-primary border-0 font-mono text-[10px] uppercase tracking-widest">
                        {categoryServices.length} {category.id === 'produit' ? 'produit' : 'service'}
                        {categoryServices.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                      {categoryServices.map(service => (
                        <ServiceCard key={service.id} service={service as any} onAdd={addToCart} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}

            {!servicesLoading && services.length === 0 && (
              <div className="py-16 text-center">
                <ShoppingCart className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Aucun service configuré</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
                  Ajoutez vos services dans Paramètres
                </p>
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
                  onCheckout={method => { handleCheckout(method); setIsCartOpen(false); }}
                />
              </div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Transactions Manager Modal */}
        <TransactionsManager isOpen={isTransactionsOpen} onClose={() => setIsTransactionsOpen(false)} />

        {/* Add Service Modal */}
        <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Ajouter un service</DialogTitle></DialogHeader>
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <Label>Nom du service *</Label>
                <Input value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} placeholder="Ex: Coupe homme" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prix (€) *</Label>
                  <Input type="number" step="0.01" min="0" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })} placeholder="25" required />
                </div>
                <div>
                  <Label>Durée (min)</Label>
                  <Input type="number" min="5" step="5" value={serviceForm.duration} onChange={e => setServiceForm({ ...serviceForm, duration: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={serviceForm.category} onValueChange={v => setServiceForm({ ...serviceForm, category: v })}>
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
            <DialogHeader><DialogTitle>Ajouter un produit</DialogTitle></DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <Label>Nom du produit *</Label>
                <Input value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} placeholder="Ex: Gel coiffant" required />
              </div>
              <div>
                <Label>Prix de vente (€) *</Label>
                <Input type="number" step="0.01" min="0" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} placeholder="15" required />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddProductOpen(false)} className="flex-1">Annuler</Button>
                <Button type="submit" className="flex-1">Ajouter</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default POSPage;
