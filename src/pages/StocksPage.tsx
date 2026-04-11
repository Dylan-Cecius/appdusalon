import { useState, useMemo } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Search, ClipboardCheck, TrendingUp, TrendingDown, RotateCcw, Filter } from 'lucide-react';
import { useStocks, Product, getStockStatus, PRODUCT_CATEGORIES, UNIT_OPTIONS } from '@/hooks/useStocks';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  category: string;
  purchase_price: number;
  sell_price: number;
  current_stock: number;
  min_stock: number;
  unit: string;
  supplier: string;
}

const defaultProductForm: ProductFormData = {
  name: '', description: '', sku: '', category: 'capillaire',
  purchase_price: 0, sell_price: 0, current_stock: 0, min_stock: 5,
  unit: 'unité', supplier: '',
};

const statusConfig = {
  ok: { label: 'En stock', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  low: { label: 'Bientôt épuisé', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  critical: { label: 'Alerte', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  out: { label: 'Épuisé', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' },
};

const movementTypeLabels: Record<string, string> = {
  in: 'Entrée',
  out: 'Sortie',
  adjustment: 'Ajustement',
  inventory: 'Inventaire',
};

const StocksPage = () => {
  const {
    products, movements, lowStockProducts, criticalStockProducts,
    totalStockValue, totalSellValue, categoryStats,
    isLoading, createProduct, updateProduct, deleteProduct, addStockMovement,
  } = useStocks();

  const [tab, setTab] = useState('products');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>(defaultProductForm);

  // Movement modal
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementProductId, setMovementProductId] = useState('');
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [movementQty, setMovementQty] = useState(1);
  const [movementReason, setMovementReason] = useState('');
  const [movementNotes, setMovementNotes] = useState('');

  // Quick restock modal
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockProductId, setRestockProductId] = useState('');
  const [restockQty, setRestockQty] = useState(1);
  const [restockReason, setRestockReason] = useState('Réapprovisionnement');

  // Inventory modal
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [inventoryValues, setInventoryValues] = useState<Record<string, number>>({});

  // History filter
  const [historyType, setHistoryType] = useState('all');

  const resetProductForm = () => { setProductForm(defaultProductForm); setEditingProduct(null); };

  const openEdit = (p: Product) => {
    setProductForm({
      name: p.name, description: p.description || '', sku: p.sku || '',
      category: p.category, purchase_price: p.purchase_price, sell_price: p.sell_price,
      current_stock: p.current_stock, min_stock: p.min_stock,
      unit: p.unit, supplier: p.supplier || '',
    });
    setEditingProduct(p);
    setIsProductModalOpen(true);
  };

  const handleSubmitProduct = async () => {
    if (!productForm.name.trim()) return;
    if (editingProduct) {
      await updateProduct.mutateAsync({
        id: editingProduct.id,
        updates: { ...productForm, description: productForm.description || null, sku: productForm.sku || null, supplier: productForm.supplier || null },
      });
    } else {
      await createProduct.mutateAsync({
        ...productForm, description: productForm.description || null,
        sku: productForm.sku || null, supplier: productForm.supplier || null, is_active: true,
      });
    }
    setIsProductModalOpen(false);
    resetProductForm();
  };

  const openMovement = (productId: string, type: 'in' | 'out' | 'adjustment') => {
    setMovementProductId(productId);
    setMovementType(type);
    setMovementQty(1);
    setMovementReason('');
    setMovementNotes('');
    setIsMovementModalOpen(true);
  };

  const handleMovement = async () => {
    if (movementQty <= 0 && movementType !== 'adjustment') return;
    await addStockMovement.mutateAsync({
      product_id: movementProductId, type: movementType,
      quantity: movementQty, reason: movementReason || undefined, notes: movementNotes || undefined,
    });
    setIsMovementModalOpen(false);
  };

  const openRestock = (productId: string) => {
    setRestockProductId(productId);
    setRestockQty(1);
    setRestockReason('Réapprovisionnement');
    setIsRestockOpen(true);
  };

  const handleRestock = async () => {
    if (restockQty <= 0) return;
    await addStockMovement.mutateAsync({
      product_id: restockProductId, type: 'in',
      quantity: restockQty, reason: restockReason,
    });
    setIsRestockOpen(false);
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || getStockStatus(p.current_stock, p.min_stock) === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, filterCategory, filterStatus]);

  const filteredMovements = useMemo(() => {
    if (historyType === 'all') return movements;
    return movements.filter(m => m.type === historyType);
  }, [movements, historyType]);

  if (isLoading) return <MainLayout><div className="p-8 text-center text-muted-foreground">Chargement...</div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6" /> Gestion des stocks</h2>
            <p className="text-sm text-muted-foreground">{products.length} produit{products.length > 1 ? 's' : ''} · {lowStockProducts.length} alerte{lowStockProducts.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openInventory}><ClipboardCheck className="h-4 w-4 mr-2" />Inventaire</Button>
            <Button onClick={() => { resetProductForm(); setIsProductModalOpen(true); }}><Plus className="h-4 w-4 mr-2" />Nouveau produit</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Produits</p>
              <p className="text-2xl font-bold mt-1">{products.length}</p>
            </CardContent>
          </Card>
          <Card className={criticalStockProducts.length > 0 ? 'border-destructive/50' : ''}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Alertes stock</p>
              <p className={`text-2xl font-bold mt-1 ${criticalStockProducts.length > 0 ? 'text-destructive' : ''}`}>{lowStockProducts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Valeur stock (achat)</p>
              <p className="text-2xl font-bold mt-1">{totalStockValue.toFixed(0)} €</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Valeur stock (vente)</p>
              <p className="text-2xl font-bold mt-1">{totalSellValue.toFixed(0)} €</p>
            </CardContent>
          </Card>
        </div>

        {/* Category Stats */}
        {categoryStats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {categoryStats.map(cat => (
              <Card key={cat.value} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setFilterCategory(cat.value); setTab('products'); }}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">{cat.category}</p>
                  <p className="text-lg font-bold">{cat.count}</p>
                  <p className="text-xs text-muted-foreground">{cat.totalValue.toFixed(0)} €</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="alerts">
              Alertes {lowStockProducts.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{lowStockProducts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          {/* ===== PRODUCTS TAB ===== */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Catégorie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes catégories</SelectItem>
                  {PRODUCT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="ok">En stock</SelectItem>
                  <SelectItem value="low">Bientôt épuisé</SelectItem>
                  <SelectItem value="critical">Alerte</SelectItem>
                  <SelectItem value="out">Épuisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-center">Stock actuel</TableHead>
                      <TableHead className="text-center">Stock min</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-right">Prix achat</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map(p => {
                      const status = getStockStatus(p.current_stock, p.min_stock);
                      const cfg = statusConfig[status];
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                              {p.supplier && <p className="text-xs text-muted-foreground">{p.supplier}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {PRODUCT_CATEGORIES.find(c => c.value === p.category)?.label || p.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${status === 'critical' ? 'text-destructive' : status === 'low' ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                              {p.current_stock}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">{p.unit}</span>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">{p.min_stock}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={cfg.className}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{p.purchase_price.toFixed(2)} €</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="icon" className="h-7 w-7" title="Entrée rapide" onClick={() => openRestock(p.id)}>
                                <ArrowDownCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p>Aucun produit trouvé</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== ALERTS TAB ===== */}
          <TabsContent value="alerts" className="space-y-4">
            {lowStockProducts.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Tous les stocks sont OK</p>
              </CardContent></Card>
            ) : (
              lowStockProducts.map(p => {
                const status = getStockStatus(p.current_stock, p.min_stock);
                const cfg = statusConfig[status];
                return (
                  <Card key={p.id} className={status === 'critical' ? 'border-destructive/50' : 'border-amber-500/50'}>
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <AlertTriangle className={`h-5 w-5 shrink-0 ${status === 'critical' ? 'text-destructive' : 'text-amber-500'}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{p.name}</p>
                            <Badge className={cfg.className}>{cfg.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Stock : <span className="font-medium">{p.current_stock}</span> {p.unit} · Seuil : {p.min_stock}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => openRestock(p.id)}>
                        <ArrowDownCircle className="h-4 w-4 mr-1" />Réapprovisionner
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* ===== HISTORY TAB ===== */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex gap-3">
              <Select value={historyType} onValueChange={setHistoryType}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="in">Entrées</SelectItem>
                  <SelectItem value="out">Sorties</SelectItem>
                  <SelectItem value="adjustment">Ajustements</SelectItem>
                  <SelectItem value="inventory">Inventaires</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead className="text-center">Stock avant → après</TableHead>
                      <TableHead>Raison</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map(m => {
                      const product = products.find(p => p.id === m.product_id);
                      const isIn = m.type === 'in';
                      const isInventory = m.type === 'inventory';
                      const isAdjustment = m.type === 'adjustment';
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm">{format(new Date(m.created_at), 'dd/MM/yy HH:mm', { locale: fr })}</TableCell>
                          <TableCell className="font-medium">{product?.name || 'Supprimé'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {movementTypeLabels[m.type] || m.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-semibold ${isIn ? 'text-emerald-600 dark:text-emerald-400' : isInventory || isAdjustment ? '' : 'text-destructive'}`}>
                              {isIn ? '+' : isInventory || isAdjustment ? '→' : ''}{Math.abs(m.quantity)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {m.previous_stock} → {m.new_stock}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.reason || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredMovements.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Aucun mouvement</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={o => { if (!o) resetProductForm(); setIsProductModalOpen(o); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
            <DialogDescription>{editingProduct ? 'Modifiez les informations' : 'Ajoutez un produit au stock'}</DialogDescription>
          </DialogHeader>
          <ProductForm form={productForm} setForm={setProductForm} onSubmit={handleSubmitProduct}
            submitLabel={editingProduct ? 'Enregistrer' : 'Ajouter'}
            isPending={createProduct.isPending || updateProduct.isPending} />
        </DialogContent>
      </Dialog>

      {/* Movement Modal */}
      <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movementType === 'in' ? 'Entrée de stock' : movementType === 'out' ? 'Sortie de stock' : 'Ajustement'}
            </DialogTitle>
            <DialogDescription>
              {products.find(p => p.id === movementProductId)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={movementType} onValueChange={v => setMovementType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrée</SelectItem>
                  <SelectItem value="out">Sortie</SelectItem>
                  <SelectItem value="adjustment">Ajustement (définir la quantité)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{movementType === 'adjustment' ? 'Nouvelle quantité' : 'Quantité'}</Label>
              <Input type="number" min={movementType === 'adjustment' ? 0 : 1} value={movementQty}
                onChange={e => setMovementQty(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Raison</Label>
              <Input value={movementReason} onChange={e => setMovementReason(e.target.value)}
                placeholder="Réapprovisionnement, vente, casse..." />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={movementNotes} onChange={e => setMovementNotes(e.target.value)}
                placeholder="Détails supplémentaires..." rows={2} />
            </div>
            <Button onClick={handleMovement} className="w-full" disabled={addStockMovement.isPending}>
              {addStockMovement.isPending ? 'En cours...' : 'Confirmer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Restock Modal */}
      <Dialog open={isRestockOpen} onOpenChange={setIsRestockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrée rapide</DialogTitle>
            <DialogDescription>{products.find(p => p.id === restockProductId)?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quantité à ajouter</Label>
              <Input type="number" min={1} value={restockQty} onChange={e => setRestockQty(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Raison</Label>
              <Input value={restockReason} onChange={e => setRestockReason(e.target.value)} />
            </div>
            <Button onClick={handleRestock} className="w-full" disabled={restockQty <= 0 || addStockMovement.isPending}>
              {addStockMovement.isPending ? 'En cours...' : `Ajouter ${restockQty} unité${restockQty > 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Modal */}
      <Dialog open={isInventoryOpen} onOpenChange={setIsInventoryOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inventaire</DialogTitle>
            <DialogDescription>Ajustez les quantités réelles</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {products.map(p => {
              const changed = inventoryValues[p.id] !== p.current_stock;
              return (
                <div key={p.id} className={`flex items-center justify-between gap-4 p-2 rounded-lg ${changed ? 'bg-accent/30' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Théorique : {p.current_stock} {p.unit}</p>
                  </div>
                  <Input type="number" min={0} className="w-24"
                    value={inventoryValues[p.id] ?? p.current_stock}
                    onChange={e => setInventoryValues(v => ({ ...v, [p.id]: parseInt(e.target.value) || 0 }))} />
                </div>
              );
            })}
          </div>
          <Button onClick={handleInventory} className="w-full" disabled={addStockMovement.isPending}>
            {addStockMovement.isPending ? 'En cours...' : 'Valider l\'inventaire'}
          </Button>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

// Extracted outside to prevent focus loss on re-render
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
      <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description..." rows={2} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Catégorie</Label>
        <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PRODUCT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>SKU / Référence</Label>
        <Input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SHP-001" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Unité</Label>
        <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Fournisseur</Label>
        <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nom du fournisseur" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Prix d'achat (€)</Label>
        <Input type="number" min={0} step="0.01" value={form.purchase_price}
          onChange={e => setForm(f => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} />
      </div>
      <div>
        <Label>Prix de vente (€)</Label>
        <Input type="number" min={0} step="0.01" value={form.sell_price}
          onChange={e => setForm(f => ({ ...f, sell_price: parseFloat(e.target.value) || 0 }))} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Stock initial</Label>
        <Input type="number" min={0} value={form.current_stock}
          onChange={e => setForm(f => ({ ...f, current_stock: parseInt(e.target.value) || 0 }))} />
      </div>
      <div>
        <Label>Seuil d'alerte</Label>
        <Input type="number" min={0} value={form.min_stock}
          onChange={e => setForm(f => ({ ...f, min_stock: parseInt(e.target.value) || 0 }))} />
      </div>
    </div>
    <Button onClick={onSubmit} className="w-full" disabled={isPending || !form.name.trim()}>
      {isPending ? 'En cours...' : submitLabel}
    </Button>
  </div>
);

export default StocksPage;
