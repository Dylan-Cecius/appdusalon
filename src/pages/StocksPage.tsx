import { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Search, ClipboardCheck, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import { useStocks, Product } from '@/hooks/useStocks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  purchase_price: number;
  sell_price: number;
  current_stock: number;
  min_stock: number;
  unit: string;
  supplier: string;
}

const defaultProductForm: ProductFormData = {
  name: '', description: '', sku: '', purchase_price: 0,
  sell_price: 0, current_stock: 0, min_stock: 5, unit: 'unité', supplier: '',
};

const StocksPage = () => {
  const { products, movements, lowStockProducts, totalStockValue, isLoading, createProduct, updateProduct, deleteProduct, addStockMovement } = useStocks();
  const [tab, setTab] = useState('products');
  const [search, setSearch] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>(defaultProductForm);

  // Stock movement modal
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProductId, setMovementProductId] = useState('');
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [movementQty, setMovementQty] = useState(1);
  const [movementReason, setMovementReason] = useState('');

  // Inventory modal
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [inventoryValues, setInventoryValues] = useState<Record<string, number>>({});

  const resetProductForm = () => { setProductForm(defaultProductForm); setEditingProduct(null); };

  const openEdit = (p: Product) => {
    setProductForm({
      name: p.name, description: p.description || '', sku: p.sku || '',
      purchase_price: p.purchase_price, sell_price: p.sell_price,
      current_stock: p.current_stock, min_stock: p.min_stock,
      unit: p.unit, supplier: p.supplier || '',
    });
    setEditingProduct(p);
    setIsProductModalOpen(true);
  };

  const handleSubmitProduct = async () => {
    if (!productForm.name.trim()) return;
    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, updates: { ...productForm, description: productForm.description || null, sku: productForm.sku || null, supplier: productForm.supplier || null } });
    } else {
      await createProduct.mutateAsync({ ...productForm, description: productForm.description || null, sku: productForm.sku || null, supplier: productForm.supplier || null, is_active: true, category: 'revente' });
    }
    setIsProductModalOpen(false);
    resetProductForm();
  };

  const openMovement = (productId: string, type: 'in' | 'out') => {
    setMovementProductId(productId);
    setMovementType(type);
    setMovementQty(1);
    setMovementReason('');
    setIsMovementModalOpen(true);
  };

  const handleMovement = async () => {
    if (movementQty <= 0) return;
    await addStockMovement.mutateAsync({ product_id: movementProductId, type: movementType, quantity: movementQty, reason: movementReason || undefined });
    setIsMovementModalOpen(false);
  };

  const openInventory = () => {
    const vals: Record<string, number> = {};
    products.forEach(p => { vals[p.id] = p.current_stock; });
    setInventoryValues(vals);
    setIsInventoryOpen(true);
  };

  const handleInventory = async () => {
    for (const [productId, qty] of Object.entries(inventoryValues)) {
      const product = products.find(p => p.id === productId);
      if (product && product.current_stock !== qty) {
        await addStockMovement.mutateAsync({ product_id: productId, type: 'inventory', quantity: qty, reason: 'Inventaire' });
      }
    }
    setIsInventoryOpen(false);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) return <MainLayout><div className="p-8 text-center text-muted-foreground">Chargement...</div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Gestion des stocks</h2>
            <p className="text-sm text-muted-foreground">{products.length} produit{products.length > 1 ? 's' : ''} en stock</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openInventory}><ClipboardCheck className="h-4 w-4 mr-2" />Inventaire</Button>
            <Button onClick={() => { resetProductForm(); setIsProductModalOpen(true); }}><Plus className="h-4 w-4 mr-2" />Nouveau produit</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Produits en stock</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Stock bas</p>
                <p className="text-2xl font-bold">{lowStockProducts.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><TrendingUp className="h-5 w-5 text-accent-foreground" /></div>
              <div>
                <p className="text-sm text-muted-foreground">Valeur totale</p>
                <p className="text-2xl font-bold">{totalStockValue.toFixed(2)} €</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="alerts">
              Alertes {lowStockProducts.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{lowStockProducts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher un produit..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(p => (
                <Card key={p.id} className={p.current_stock <= p.min_stock ? 'border-destructive/50' : ''}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{p.name}</h3>
                        {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                        {p.supplier && <p className="text-xs text-muted-foreground">Fournisseur: {p.supplier}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Edit2 className="h-3 w-3" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer {p.name} ?</AlertDialogTitle>
                              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteProduct.mutate(p.id)}>Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-2xl font-bold ${p.current_stock <= p.min_stock ? 'text-destructive' : ''}`}>{p.current_stock}</span>
                        <span className="text-sm text-muted-foreground ml-1">{p.unit}{p.current_stock > 1 ? 's' : ''}</span>
                      </div>
                      {p.current_stock <= p.min_stock && <Badge variant="destructive" className="text-xs">Stock bas</Badge>}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Achat: {p.purchase_price.toFixed(2)} €</span>
                      <span>Vente: {p.sell_price.toFixed(2)} €</span>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openMovement(p.id, 'in')}>
                        <ArrowDownCircle className="h-3.5 w-3.5 mr-1" />Entrée
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openMovement(p.id, 'out')}>
                        <ArrowUpCircle className="h-3.5 w-3.5 mr-1" />Sortie
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun produit trouvé</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {lowStockProducts.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune alerte de stock</p>
              </CardContent></Card>
            ) : (
              lowStockProducts.map(p => (
                <Card key={p.id} className="border-destructive/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Stock actuel : <span className="text-destructive font-medium">{p.current_stock}</span> / Seuil minimum : {p.min_stock}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openMovement(p.id, 'in')}>
                      <ArrowDownCircle className="h-4 w-4 mr-1" />Réapprovisionner
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Derniers mouvements</CardTitle></CardHeader>
              <CardContent>
                {movements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucun mouvement enregistré</p>
                ) : (
                  <div className="space-y-3">
                    {movements.map(m => {
                      const product = products.find(p => p.id === m.product_id);
                      const isIn = m.type === 'in';
                      const isInventory = m.type === 'inventory';
                      return (
                        <div key={m.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0">
                          <div className="flex items-center gap-3">
                            {isInventory ? <RotateCcw className="h-4 w-4 text-muted-foreground" /> :
                              isIn ? <TrendingDown className="h-4 w-4 text-emerald-500" /> : <TrendingUp className="h-4 w-4 text-destructive" />}
                            <div>
                              <p className="font-medium text-sm">{product?.name || 'Produit supprimé'}</p>
                              <p className="text-xs text-muted-foreground">
                                {isInventory ? 'Inventaire' : isIn ? 'Entrée' : 'Sortie'}
                                {m.reason && ` — ${m.reason}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold text-sm ${isInventory ? '' : isIn ? 'text-emerald-500' : 'text-destructive'}`}>
                              {isInventory ? `→ ${m.new_stock}` : isIn ? `+${m.quantity}` : `-${m.quantity}`}
                            </p>
                            <p className="text-xs text-muted-foreground">{format(new Date(m.created_at), 'dd MMM HH:mm', { locale: fr })}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={o => { if (!o) resetProductForm(); setIsProductModalOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
            <DialogDescription>{editingProduct ? 'Modifiez les informations du produit' : 'Ajoutez un nouveau produit au stock'}</DialogDescription>
          </DialogHeader>
          <ProductForm form={productForm} setForm={setProductForm} onSubmit={handleSubmitProduct} submitLabel={editingProduct ? 'Enregistrer' : 'Ajouter'} isPending={createProduct.isPending || updateProduct.isPending} />
        </DialogContent>
      </Dialog>

      {/* Movement Modal */}
      <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{movementType === 'in' ? 'Entrée de stock' : 'Sortie de stock'}</DialogTitle>
            <DialogDescription>Enregistrez un mouvement de stock</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quantité</Label>
              <Input type="number" min={1} value={movementQty} onChange={e => setMovementQty(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Raison (optionnel)</Label>
              <Input value={movementReason} onChange={e => setMovementReason(e.target.value)} placeholder="Réapprovisionnement, vente, casse..." />
            </div>
            <Button onClick={handleMovement} className="w-full" disabled={movementQty <= 0 || addStockMovement.isPending}>
              {addStockMovement.isPending ? 'En cours...' : 'Confirmer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Modal */}
      <Dialog open={isInventoryOpen} onOpenChange={setIsInventoryOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inventaire</DialogTitle>
            <DialogDescription>Ajustez les quantités réelles de chaque produit</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {products.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Stock théorique : {p.current_stock}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={inventoryValues[p.id] ?? p.current_stock}
                  onChange={e => setInventoryValues(v => ({ ...v, [p.id]: parseInt(e.target.value) || 0 }))}
                />
              </div>
            ))}
          </div>
          <Button onClick={handleInventory} className="w-full" disabled={addStockMovement.isPending}>
            {addStockMovement.isPending ? 'En cours...' : 'Valider l\'inventaire'}
          </Button>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

// Extracted outside to prevent focus loss
const ProductForm = ({ form, setForm, onSubmit, submitLabel, isPending }: {
  form: ProductFormData;
  setForm: React.Dispatch<React.SetStateAction<ProductFormData>>;
  onSubmit: () => void;
  submitLabel: string;
  isPending: boolean;
}) => (
  <div className="space-y-4">
    <div>
      <Label>Nom *</Label>
      <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Shampoing réparateur" />
    </div>
    <div>
      <Label>Description</Label>
      <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description du produit..." rows={2} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>SKU / Référence</Label>
        <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SHP-001" />
      </div>
      <div>
        <Label>Unité</Label>
        <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unité">Unité</SelectItem>
            <SelectItem value="flacon">Flacon</SelectItem>
            <SelectItem value="tube">Tube</SelectItem>
            <SelectItem value="boîte">Boîte</SelectItem>
            <SelectItem value="litre">Litre</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Prix d'achat (€)</Label>
        <Input type="number" min={0} step="0.01" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} />
      </div>
      <div>
        <Label>Prix de vente (€)</Label>
        <Input type="number" min={0} step="0.01" value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: parseFloat(e.target.value) || 0 }))} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Stock initial</Label>
        <Input type="number" min={0} value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: parseInt(e.target.value) || 0 }))} />
      </div>
      <div>
        <Label>Seuil d'alerte</Label>
        <Input type="number" min={0} value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: parseInt(e.target.value) || 0 }))} />
      </div>
    </div>
    <div>
      <Label>Fournisseur</Label>
      <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nom du fournisseur" />
    </div>
    <Button onClick={onSubmit} className="w-full" disabled={isPending || !form.name.trim()}>
      {isPending ? 'En cours...' : submitLabel}
    </Button>
  </div>
);

export default StocksPage;
