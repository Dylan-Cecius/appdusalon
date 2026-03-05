import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CLIENT_CREATED: { label: 'Client créé', color: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  CLIENT_DELETED: { label: 'Client supprimé (RGPD)', color: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  EXPORT_RGPD: { label: 'Export RGPD', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  TRANSACTION_CREATED: { label: 'Transaction', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  LOGIN: { label: 'Connexion', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400' },
};

const ActivityLogViewer = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('activity_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = filterAction === 'all'
    ? logs
    : logs.filter(log => log.action === filterAction);

  const formatDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) return '—';
    return Object.entries(details)
      .map(([key, value]) => {
        if (key === 'amount') return `${value} €`;
        if (key === 'count') return `${value} clients`;
        return `${value}`;
      })
      .join(', ');
  };

  return (
    <Card className="p-6">
      <CardHeader className="px-0 pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <FileText className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-primary">Journal d'activité</CardTitle>
              <p className="text-sm text-muted-foreground">Traçabilité RGPD — 100 derniers événements</p>
            </div>
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrer par action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              <SelectItem value="CLIENT_CREATED">Client créé</SelectItem>
              <SelectItem value="CLIENT_DELETED">Client supprimé</SelectItem>
              <SelectItem value="EXPORT_RGPD">Export RGPD</SelectItem>
              <SelectItem value="TRANSACTION_CREATED">Transaction</SelectItem>
              <SelectItem value="LOGIN">Connexion</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Aucun événement enregistré</div>
        ) : (
          <ScrollArea className="w-full">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Date / Heure</TableHead>
                    <TableHead className="min-w-[150px]">Action</TableHead>
                    <TableHead className="min-w-[200px]">Détails</TableHead>
                    <TableHead className="min-w-[180px]">Utilisateur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log: any) => {
                    const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-muted text-muted-foreground' };
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={actionInfo.color}>
                            {actionInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDetails(log.details)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.user_email}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default ActivityLogViewer;
