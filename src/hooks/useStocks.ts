import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string;
  purchase_price: number;
  sell_price: number;
  current_stock: number;
  min_stock: number;
  unit: string;
  supplier: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  salon_id: string;
  product_id: string;
  type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export type StockStatus = 'ok' | 'low' | 'critical';

export const getStockStatus = (current: number, min: number): StockStatus => {
  if (current <= min) return 'critical';
  if (current <= min * 1.2) return 'low';
  return 'ok';
};

export const PRODUCT_CATEGORIES = [
  { value: 'capillaire', label: 'Capillaire' },
  { value: 'coloration', label: 'Coloration' },
  { value: 'soin', label: 'Soin' },
  { value: 'coiffage', label: 'Coiffage' },
  { value: 'barbe', label: 'Barbe' },
  { value: 'accessoire', label: 'Accessoire' },
  { value: 'autre', label: 'Autre' },
];

export const UNIT_OPTIONS = [
  { value: 'unité', label: 'Unité' },
  { value: 'ml', label: 'ml' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'flacon', label: 'Flacon' },
  { value: 'tube', label: 'Tube' },
  { value: 'boîte', label: 'Boîte' },
];

export const useStocks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products' as any)
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Product[];
    },
    enabled: !!user,
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ['stock_movements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as unknown as StockMovement[];
    },
    enabled: !!user,
  });

  const getSalonId = async () => {
    const { data } = await supabase.rpc('get_user_salon_id', { _user_id: user!.id });
    return data as string;
  };

  const createProduct = useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'salon_id' | 'created_at' | 'updated_at'>) => {
      const salonId = await getSalonId();
      const { error } = await supabase.from('products' as any).insert({ ...product, salon_id: salonId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produit ajouté' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const { error } = await supabase.from('products' as any).update({ ...updates, updated_at: new Date().toISOString() } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produit mis à jour' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produit supprimé' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const addStockMovement = useMutation({
    mutationFn: async (movement: { product_id: string; type: string; quantity: number; reason?: string; notes?: string }) => {
      const salonId = await getSalonId();
      const product = products.find(p => p.id === movement.product_id);
      if (!product) throw new Error('Produit introuvable');

      const previousStock = product.current_stock;
      let newStock: number;
      if (movement.type === 'in') {
        newStock = previousStock + movement.quantity;
      } else if (movement.type === 'out') {
        newStock = Math.max(0, previousStock - movement.quantity);
      } else {
        // adjustment or inventory
        newStock = movement.quantity;
      }

      const reasonText = [movement.reason, movement.notes].filter(Boolean).join(' — ');

      const { error: mvError } = await supabase.from('stock_movements' as any).insert({
        salon_id: salonId,
        product_id: movement.product_id,
        type: movement.type,
        quantity: movement.type === 'out' ? -movement.quantity : movement.quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reason: reasonText || null,
        created_by: user!.id,
      } as any);
      if (mvError) throw mvError;

      const { error: upError } = await supabase.from('products' as any)
        .update({ current_stock: newStock, updated_at: new Date().toISOString() } as any)
        .eq('id', movement.product_id);
      if (upError) throw upError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      toast({ title: 'Stock mis à jour' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const activeProducts = products.filter(p => p.is_active);
  const lowStockProducts = activeProducts.filter(p => getStockStatus(p.current_stock, p.min_stock) !== 'ok');
  const criticalStockProducts = activeProducts.filter(p => getStockStatus(p.current_stock, p.min_stock) === 'critical');
  const totalStockValue = activeProducts.reduce((sum, p) => sum + (p.current_stock * p.purchase_price), 0);
  const totalSellValue = activeProducts.reduce((sum, p) => sum + (p.current_stock * p.sell_price), 0);

  // Category stats
  const categoryStats = PRODUCT_CATEGORIES.map(cat => {
    const catProducts = activeProducts.filter(p => p.category === cat.value);
    return {
      category: cat.label,
      value: cat.value,
      count: catProducts.length,
      totalValue: catProducts.reduce((sum, p) => sum + (p.current_stock * p.purchase_price), 0),
    };
  }).filter(c => c.count > 0);

  return {
    products: activeProducts,
    allProducts: products,
    movements,
    lowStockProducts,
    criticalStockProducts,
    totalStockValue,
    totalSellValue,
    categoryStats,
    isLoading,
    movementsLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    addStockMovement,
  };
};
