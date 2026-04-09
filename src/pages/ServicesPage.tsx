import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import ServiceManagement from '@/components/ServiceManagement';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { BarChart3, Settings2, TrendingUp, CalendarDays, Scissors } from 'lucide-react';
import { startOfDay, startOfWeek, startOfMonth, isAfter, format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoryRow {
  date: Date;
  clientName: string | null;
  serviceName: string;
  price: number;
  staffName: string | null;
}

const ServicesPage = () => {
  const { services } = useSupabaseServices();
  const { user } = useAuth();
  

  // Stats
  const [stats, setStats] = useState({ todayCount: 0, todayRevenue: 0, weekCount: 0, weekRevenue: 0, monthCount: 0, monthRevenue: 0 });
  // History
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data: salonId } = await supabase.rpc('get_user_salon_id', { _user_id: user.id });
        if (!salonId) return;

        // Fetch transactions with staff and client info
        const { data: transactions } = await supabase
          .from('transactions')
          .select('items, transaction_date, staff_id, client_id')
          .eq('salon_id', salonId)
          .order('transaction_date', { ascending: false });

        // Fetch staff and clients for name lookup
        const { data: staffData } = await supabase.from('staff').select('id, name').eq('salon_id', salonId);
        const { data: clientsData } = await supabase.from('clients').select('id, name').eq('salon_id', salonId);

        const staffMap = new Map((staffData || []).map((s: any) => [s.id, s.name]));
        const clientMap = new Map((clientsData || []).map((c: any) => [c.id, c.name]));

        // Get service names set
        const serviceNames = new Set(services.map(s => s.name.toLowerCase().trim()));

        const now = new Date();
        const dayStart = startOfDay(now);
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const monthStart = startOfMonth(now);

        let todayCount = 0, todayRevenue = 0, weekCount = 0, weekRevenue = 0, monthCount = 0, monthRevenue = 0;
        const historyRows: HistoryRow[] = [];

        transactions?.forEach((tx: any) => {
          const txDate = new Date(tx.transaction_date);
          const items = tx.items as any[];
          items?.forEach((item: any) => {
            const name = item.name?.toLowerCase().trim();
            if (!name || !serviceNames.has(name)) return;
            const qty = item.quantity || 1;
            const price = (item.price || 0) * qty;

            counts[name] = (counts[name] || 0) + qty;

            if (isAfter(txDate, monthStart)) { monthCount += qty; monthRevenue += price; }
            if (isAfter(txDate, weekStart)) { weekCount += qty; weekRevenue += price; }
            if (isAfter(txDate, dayStart)) { todayCount += qty; todayRevenue += price; }

            // Add to history (collect all, slice later)
            for (let q = 0; q < qty; q++) {
              historyRows.push({
                date: txDate,
                clientName: tx.client_id ? clientMap.get(tx.client_id) || null : null,
                serviceName: item.name,
                price: item.price || 0,
                staffName: tx.staff_id ? staffMap.get(tx.staff_id) || null : null,
              });
            }
          });
        });

        
        setStats({ todayCount, todayRevenue, weekCount, weekRevenue, monthCount, monthRevenue });
        setHistory(historyRows.slice(0, 50));
      } catch (err) {
        console.error('Error fetching service data:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchData();
  }, [user, services]);


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

        <TabsContent value="overview" className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Scissors className="h-4 w-4" />
                Aujourd'hui
              </div>
              <p className="text-2xl font-bold">{stats.todayCount}</p>
              <p className="text-xs text-muted-foreground">{stats.todayRevenue.toFixed(0)}€ de CA</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="h-4 w-4" />
                Cette semaine
              </div>
              <p className="text-2xl font-bold">{stats.weekCount}</p>
              <p className="text-xs text-muted-foreground">{stats.weekRevenue.toFixed(0)}€ de CA</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <CalendarDays className="h-4 w-4" />
                Ce mois
              </div>
              <p className="text-2xl font-bold">{stats.monthCount}</p>
              <p className="text-xs text-muted-foreground">{stats.monthRevenue.toFixed(0)}€ de CA</p>
            </Card>
          </div>

          {/* History table */}
          <div className="rounded-lg border bg-card">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Historique des derniers services</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead>Employé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell>
                  </TableRow>
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun historique</TableCell>
                  </TableRow>
                ) : (
                  history.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{format(row.date, 'dd/MM/yyyy', { locale: fr })}</TableCell>
                      <TableCell className="text-muted-foreground">{format(row.date, 'HH:mm')}</TableCell>
                      <TableCell>{row.clientName || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="font-medium">{row.serviceName}</TableCell>
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
          <ServiceManagement />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default ServicesPage;
