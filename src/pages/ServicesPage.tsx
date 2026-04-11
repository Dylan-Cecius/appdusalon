import { useState, useEffect, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BarChart3, CalendarDays, CalendarRange, CalendarCheck, CalendarIcon, X } from 'lucide-react';
import { startOfDay, startOfWeek, startOfMonth, isAfter, isBefore, format, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

  const [allRows, setAllRows] = useState<HistoryRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Date range filter
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [appliedStart, setAppliedStart] = useState<Date | undefined>();
  const [appliedEnd, setAppliedEnd] = useState<Date | undefined>();

  useEffect(() => {
    const fetchData = async () => {
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
        const serviceNames = new Set(services.map(s => s.name.toLowerCase().trim()));

        const rows: HistoryRow[] = [];
        transactions?.forEach((tx: any) => {
          const txDate = new Date(tx.transaction_date);
          const items = tx.items as any[];
          items?.forEach((item: any) => {
            const name = item.name?.toLowerCase().trim();
            if (!name || !serviceNames.has(name)) return;
            const qty = item.quantity || 1;
            for (let q = 0; q < qty; q++) {
              rows.push({
                date: txDate,
                clientName: tx.client_id ? clientMap.get(tx.client_id) || null : null,
                serviceName: item.name,
                price: item.price || 0,
                staffName: tx.staff_id ? staffMap.get(tx.staff_id) || null : null,
              });
            }
          });
        });

        setAllRows(rows);
      } catch (err) {
        console.error('Error fetching service data:', err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [user, services]);

  // Filtered rows based on applied date range
  const filteredRows = useMemo(() => {
    if (!appliedStart && !appliedEnd) return allRows;
    return allRows.filter(r => {
      if (appliedStart && isBefore(r.date, startOfDay(appliedStart))) return false;
      if (appliedEnd && isAfter(r.date, endOfDay(appliedEnd))) return false;
      return true;
    });
  }, [allRows, appliedStart, appliedEnd]);

  // Stats computed from filtered rows
  const stats = useMemo(() => {
    const now = new Date();
    const dayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);

    // If custom range applied, show single aggregate
    if (appliedStart || appliedEnd) {
      const count = filteredRows.length;
      const revenue = filteredRows.reduce((s, r) => s + r.price, 0);
      return { todayCount: count, todayRevenue: revenue, weekCount: count, weekRevenue: revenue, monthCount: count, monthRevenue: revenue, isCustom: true };
    }

    let todayCount = 0, todayRevenue = 0, weekCount = 0, weekRevenue = 0, monthCount = 0, monthRevenue = 0;
    filteredRows.forEach(r => {
      if (isAfter(r.date, dayStart)) { todayCount++; todayRevenue += r.price; }
      if (isAfter(r.date, weekStart)) { weekCount++; weekRevenue += r.price; }
      if (isAfter(r.date, monthStart)) { monthCount++; monthRevenue += r.price; }
    });
    return { todayCount, todayRevenue, weekCount, weekRevenue, monthCount, monthRevenue, isCustom: false };
  }, [filteredRows, appliedStart, appliedEnd]);

  const historyDisplay = filteredRows.slice(0, 50);

  const handleApply = () => { setAppliedStart(startDate); setAppliedEnd(endDate); };
  const handleClear = () => { setStartDate(undefined); setEndDate(undefined); setAppliedStart(undefined); setAppliedEnd(undefined); };

  return (
    <MainLayout>
      <div className="space-y-4">
          {/* KPI Boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { label: "CA Services du jour", value: stats.todayRevenue, icon: CalendarDays, gradient: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/20' },
              { label: "CA Services de la semaine", value: stats.weekRevenue, icon: CalendarRange, gradient: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/20' },
              { label: "CA Services du mois", value: stats.monthRevenue, icon: CalendarCheck, gradient: 'from-violet-500 to-violet-600', glow: 'shadow-violet-500/20' },
            ].map((stat) => (
              <Card
                key={stat.label}
                className={`relative overflow-hidden p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl ${stat.glow}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.07]`} />
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white mb-4 shadow-lg ${stat.glow}`}>
                  <stat.icon className="h-7 w-7" />
                </div>
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                  {stat.value.toFixed(2)}€
                </p>
                <p className="text-sm text-muted-foreground mt-2 font-medium">{stat.label}</p>
              </Card>
            ))}
          </div>

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
                {dataLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell>
                  </TableRow>
                ) : historyDisplay.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun historique</TableCell>
                  </TableRow>
                ) : (
                  historyDisplay.map((row, i) => (
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
      </div>
    </MainLayout>
  );
};

export default ServicesPage;
