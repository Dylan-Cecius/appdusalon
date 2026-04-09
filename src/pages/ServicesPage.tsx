import { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import ServiceManagement from '@/components/ServiceManagement';
import { useSupabaseServices, Service } from '@/hooks/useSupabaseServices';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Settings2 } from 'lucide-react';

const ServicesPage = () => {
  const { services, loading } = useSupabaseServices();
  const { user } = useAuth();
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) return;
      try {
        const { data: salonId } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });
        if (!salonId) return;

        const { data: transactions } = await supabase
          .from('transactions')
          .select('items')
          .eq('salon_id', salonId);

        const counts: Record<string, number> = {};
        transactions?.forEach((tx) => {
          const items = tx.items as any[];
          items?.forEach((item: any) => {
            const name = item.name?.toLowerCase().trim();
            if (name) {
              counts[name] = (counts[name] || 0) + (item.quantity || 1);
            }
          });
        });
        setServiceCounts(counts);
      } catch (err) {
        console.error('Error fetching service counts:', err);
      } finally {
        setCountsLoading(false);
      }
    };
    fetchCounts();
  }, [user]);

  const getCount = (serviceName: string) => {
    return serviceCounts[serviceName.toLowerCase().trim()] || 0;
  };

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => getCount(b.name) - getCount(a.name));
  }, [services, serviceCounts]);

  const categoryLabels: Record<string, string> = {
    coupe: 'Coupe', coloration: 'Coloration', barbe: 'Barbe',
    soin: 'Soin', combo: 'Combo', produit: 'Produit', general: 'Général',
  };

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
            Gérer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="text-right">Durée</TableHead>
                  <TableHead className="text-right">Réalisations</TableHead>
                  <TableHead className="text-right">CA généré</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading || countsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : sortedServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucun service trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedServices.map((service) => {
                    const count = getCount(service.name);
                    const revenue = count * service.price;
                    return (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: service.color || '#6B7280' }}
                            />
                            <span className="font-medium">{service.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabels[service.category] || service.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{service.price}€</TableCell>
                        <TableCell className="text-right text-muted-foreground">{service.duration} min</TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold">{count}</span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {revenue.toFixed(0)}€
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="manage">
          <ServiceManagement />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default ServicesPage;
