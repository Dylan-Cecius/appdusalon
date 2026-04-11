import { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import ProductManagement from '@/components/ProductManagement';
import { useStocks, PRODUCT_CATEGORIES, getStockStatus } from '@/hooks/useStocks';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BarChart3, Settings2, ShoppingBag, TrendingUp, AlertTriangle, Package, Plus, Edit2, Trash2, CalendarIcon, X, CalendarDays, CalendarRange, CalendarCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { startOfDay, startOfWeek, startOfMonth, isAfter, isBefore, endOfDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const ProduitsPage = () => {
  const { user } = useAuth();
  const {
    products, allProducts, isLoading,
    createProduct, updateProduct, deleteProduct,
    totalStockValue, totalSellValue,
    lowStockProducts, criticalStockProducts,
  } = useStocks();

  // All product rows (unfiltered)
  interface ProductRow { date: Date; clientName: string | null; productName: string; quantity: number; price: number; staffName: string | null; }
  const [allRows, setAllRows] = useState<ProductRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Date range filter
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [appliedStart, setAppliedStart] = useState<Date | undefined>();
  const [appliedEnd, setAppliedEnd] = useState<Date | undefined>();

  useEffect(() => {
    const fetchSalesData = async () => {
      if (!user) return;
      try {
        const { data: salonId } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });
        if (!salonId) return;

        const { data: transactions } = await supabase
          .from('transactions')
          .select('items, transaction_date, staff_id, client_id')
          .eq('salon_id', salonId)
          .order('transaction_date', { ascending: false });

        const { data: staffData } = await supabase.from('staff').select('id, name').eq('salon_id', salonId);
        const { data: clientsData } = await supabase.from('clients').select('id, name').eq('salon_id', salonId);

        const staffMap = new Map((staffData || []).map((s: any) => [s.id, s.name]));
        const clientMap = new Map((clientsData || []).map((c: any) => [c.id, c.name]));
        const productNames = new Set(products.map(p => p.name.toLowerCase().trim()));

        const rows: ProductRow[] = [];
        transactions?.forEach((tx: any) => {
          const txDate = new Date(tx.transaction_date);
          const items = tx.items as any[];
          items?.forEach((item: any) => {
            const name = item.name?.toLowerCase().trim();
            if (!name || !productNames.has(name)) return;
            const qty = item.quantity || 1;
            rows.push({
              date: txDate,
              clientName: tx.client_id ? clientMap.get(tx.client_id) || null : null,
              productName: item.name,
              quantity: qty,
              price: item.price || 0,
              staffName: tx.staff_id ? staffMap.get(tx.staff_id) || null : null,
            });
          });
        });

        setAllRows(rows);
      } catch (err) {
        console.error('Error fetching product sales stats:', err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchSalesData();
  }, [user, products]);

  const filteredRows = useMemo(() => {
    if (!appliedStart && !appliedEnd) return allRows;
    return allRows.filter(r => {
      if (appliedStart && isBefore(r.date, startOfDay(appliedStart))) return false;
      if (appliedEnd && isAfter(r.date, endOfDay(appliedEnd))) return false;
      return true;
    });
  }, [allRows, appliedStart, appliedEnd]);

  const salesStats = useMemo(() => {
    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    if (appliedStart || appliedEnd) {
      let count = 0, revenue = 0;
      filteredRows.forEach(r => { count += r.quantity; revenue += r.price * r.quantity; });
      return { todayCount: count, todayRevenue: revenue, weekCount: count, weekRevenue: revenue, monthCount: count, monthRevenue: revenue, isCustom: true };
    }

    let todayCount = 0, weekCount = 0, monthCount = 0;
    let todayRevenue = 0, weekRevenue = 0, monthRevenue = 0;
    filteredRows.forEach(r => {
      const p = r.price * r.quantity;
      if (isAfter(r.date, dayStart)) { todayCount += r.quantity; todayRevenue += p; }
      if (isAfter(r.date, weekStart)) { weekCount += r.quantity; weekRevenue += p; }
      if (isAfter(r.date, monthStart)) { monthCount += r.quantity; monthRevenue += p; }
    });
    return { todayCount, todayRevenue, weekCount, weekRevenue, monthCount, monthRevenue, isCustom: false };
  }, [filteredRows, appliedStart, appliedEnd]);

  const historyDisplay = filteredRows.slice(0, 50);
  const handleApply = () => { setAppliedStart(startDate); setAppliedEnd(endDate); };
  const handleClear = () => { setStartDate(undefined); setEndDate(undefined); setAppliedStart(undefined); setAppliedEnd(undefined); };

  // Product form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '', category: 'capillaire', sell_price: '', purchase_price: '',
    current_stock: '', min_stock: '5', unit: 'unité', supplier: '', description: '', sku: '',
  });

  const resetForm = () => {
    setFormData({
      name: '', category: 'capillaire', sell_price: '', purchase_price: '',
      current_stock: '', min_stock: '5', unit: 'unité', supplier: '', description: '', sku: '',
    });
    setEditingProduct(null);
  };

  const handleOpenModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name, category: product.category,
        sell_price: product.sell_price.toString(),
        purchase_price: (product.purchase_price || 0).toString(),
        current_stock: product.current_stock.toString(),
        min_stock: product.min_stock.toString(),
        unit: product.unit, supplier: product.supplier || '',
        description: product.description || '', sku: product.sku || '',
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const data = {
      name: formData.name.trim(),
      category: formData.category,
      sell_price: parseFloat(formData.sell_price) || 0,
      purchase_price: parseFloat(formData.purchase_price) || 0,
      current_stock: parseInt(formData.current_stock) || 0,
      min_stock: parseInt(formData.min_stock) || 5,
      unit: formData.unit,
      supplier: formData.supplier || null,
      description: formData.description || null,
      sku: formData.sku || null,
      is_active: true,
    };

    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, updates: data });
    } else {
      createProduct.mutate(data);
    }
    setIsModalOpen(false);
    resetForm();
  };

  const handleDelete = (product: any) => {
    const input = prompt(`⚠️ Supprimer "${product.name}" ?\n\nTapez "SUPPRIMER" pour confirmer :`);
    if (input !== 'SUPPRIMER') return;
    deleteProduct.mutate(product.id);
  };

  const categoryLabels: Record<string, string> = {};
  PRODUCT_CATEGORIES.forEach(c => { categoryLabels[c.value] = c.label; });

  return (
    <MainLayout>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Gérer le stock
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats cards */}
          {salesStats.isCustom ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <ShoppingBag className="h-4 w-4" />
                  Ventes (période)
                </div>
                <p className="text-2xl font-bold">{salesStats.todayCount}</p>
                <p className="text-sm font-bold text-green-500">{salesStats.todayRevenue.toFixed(0)}€ de CA</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Package className="h-4 w-4" />
                  Valeur du stock
                </div>
                <p className="text-2xl font-bold">{totalSellValue.toFixed(0)}€</p>
                <p className="text-xs text-muted-foreground">{products.length} produits actifs</p>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <ShoppingBag className="h-4 w-4" />
                  Ventes aujourd'hui
                </div>
                <p className="text-2xl font-bold">{salesStats.todayCount}</p>
                <p className="text-sm font-bold text-green-500">{salesStats.todayRevenue.toFixed(0)}€ de CA</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Cette semaine
                </div>
                <p className="text-2xl font-bold">{salesStats.weekCount}</p>
                <p className="text-sm font-bold text-green-500">{salesStats.weekRevenue.toFixed(0)}€ de CA</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <BarChart3 className="h-4 w-4" />
                  Ce mois
                </div>
                <p className="text-2xl font-bold">{salesStats.monthCount}</p>
                <p className="text-sm font-bold text-green-500">{salesStats.monthRevenue.toFixed(0)}€ de CA</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Package className="h-4 w-4" />
                  Valeur du stock
                </div>
                <p className="text-2xl font-bold">{totalSellValue.toFixed(0)}€</p>
                <p className="text-xs text-muted-foreground">{products.length} produits actifs</p>
              </Card>
            </div>
          )}

          {/* Date range picker */}
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd/MM/yyyy') : 'Date début'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={fr} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd/MM/yyyy') : 'Date fin'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={fr} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Button size="sm" onClick={handleApply} disabled={!startDate && !endDate}>Appliquer</Button>
            {(appliedStart || appliedEnd) && (
              <Button size="sm" variant="ghost" onClick={handleClear}><X className="h-4 w-4 mr-1" />Effacer</Button>
            )}
          </div>

          {/* Product sales history */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Historique des dernières ventes produits</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead>Employé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell>
                  </TableRow>
                ) : historyDisplay.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun historique</TableCell>
                  </TableRow>
                ) : (
                  historyDisplay.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{format(row.date, 'dd/MM/yyyy', { locale: fr })}</TableCell>
                      <TableCell className="text-muted-foreground">{format(row.date, 'HH:mm')}</TableCell>
                      <TableCell>{row.clientName || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="font-medium">{row.productName}</TableCell>
                      <TableCell className="text-right">{row.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{row.price}€</TableCell>
                      <TableCell>{row.staffName || <span className="text-muted-foreground">—</span>}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <ProductManagement />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Product Modal */}
      <Dialog open={isModalOpen} onOpenChange={(v) => { if (!v) { setIsModalOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nom *</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unité</Label>
                <Select value={formData.unit} onValueChange={v => setFormData({...formData, unit: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['unité','ml','g','L','flacon','tube','boîte'].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prix de vente (€)</Label>
                <Input type="number" step="0.01" min="0" value={formData.sell_price} onChange={e => setFormData({...formData, sell_price: e.target.value})} />
              </div>
              <div>
                <Label>Prix d'achat (€)</Label>
                <Input type="number" step="0.01" min="0" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} />
              </div>
              <div>
                <Label>Stock actuel</Label>
                <Input type="number" min="0" value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: e.target.value})} />
              </div>
              <div>
                <Label>Stock minimum</Label>
                <Input type="number" min="0" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} />
              </div>
              <div className="col-span-2">
                <Label>Fournisseur</Label>
                <Input value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); resetForm(); }} className="flex-1">Annuler</Button>
              <Button type="submit" className="flex-1">{editingProduct ? 'Modifier' : 'Ajouter'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ProduitsPage;
