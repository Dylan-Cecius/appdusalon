import { ClientsProvider } from '@/contexts/ClientsContext';
import NewClientDialog from '@/components/NewClientDialog';
import { useState, useMemo, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { useClients } from '@/hooks/useClients';
import { usePermissions } from '@/hooks/usePermissions';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, User, Phone, Mail, FileText, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ClientDetailModal from '@/components/ClientDetailModal';
import type { Client } from '@/hooks/useClients';
import { format } from 'date-fns';
import { useSubscriptionRights } from '@/hooks/useSubscriptionRights';

const ClientsWorkspace = () => {
  const { clients, loading, error, hasSnapshot, addClient, getClientStats, refreshClients } = useClients();
  const { permissions } = usePermissions();
  const { salonSettings } = useSupabaseSettings();
  const { logActivity } = useActivityLog();
  const { rights } = useSubscriptionRights();
  const canUseClientNotes = rights.canAccessFullClientNotes;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'newest' | 'oldest'>('name-asc');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const selectedClient = clients.find(client => client.id === selectedClientId) ?? null;
  const [exportError, setExportError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [exportConfirmType, setExportConfirmType] = useState<'csv' | 'json' | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const filteredAndSortedClients = useMemo(() => {
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery)
    );
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'newest': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default: return 0;
      }
    });
  }, [clients, searchQuery, sortBy]);

  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

  const handleExport = useCallback(async (type: 'csv' | 'json') => {
    if (loading || error || !hasSnapshot) return;
    setExportError(null);
    setIsExporting(true);
    try {
      // Fetch stats for all clients
      const clientsWithStats = await Promise.all(
        clients.map(async (client) => {
          const stats = await getClientStats(client.id);
          return { ...client, ...stats };
        })
      );

      const salonName = sanitizeName(salonSettings?.name || 'salon');
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const filename = `clients-${salonName}-${dateStr}`;

      if (type === 'csv') {
        const header = 'Nom,Téléphone,Email,Date de naissance,Date de création,Nombre de visites,Total dépensé (€),Notes';
        const rows = clientsWithStats.map(c =>
          [
            `"${c.name}"`,
            `"${c.phone}"`,
            `"${c.email || ''}"`,
            `"${c.birth_date ? format(new Date(c.birth_date + 'T12:00:00'), 'dd/MM/yyyy') : ''}"`,
            `"${format(new Date(c.created_at), 'dd/MM/yyyy')}"`,
            c.visitCount,
            c.totalSpent.toFixed(2),
            `"${(c.notes || '').replace(/"/g, '""')}"`,
          ].join(',')
        );
        const csv = [header, ...rows].join('\n');
        downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
      } else {
        const data = clientsWithStats.map(c => ({
          nom: c.name,
          telephone: c.phone,
          email: c.email || null,
          date_naissance: c.birth_date || null,
          date_creation: format(new Date(c.created_at), 'dd/MM/yyyy'),
          nombre_visites: c.visitCount,
          total_depense: c.totalSpent,
          notes: c.notes || null,
        }));
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, `${filename}.json`, 'application/json');
      }
      await logActivity('EXPORT_RGPD', { format: type.toUpperCase(), count: clients.length });
    } catch {
      setExportError('Export interrompu : les données complètes n’ont pas pu être vérifiées. Réessayez.');
    } finally {
      setIsExporting(false);
      setExportConfirmType(null);
    }
  }, [clients, getClientStats, salonSettings, loading, error, hasSnapshot, logActivity]);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Clients</h1>
            <p className="mt-1 text-xs text-muted-foreground">{clients.length} fiches · coordonnées, historique et notes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {permissions.isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => setExportConfirmType('csv')} disabled={clients.length === 0 || loading || !!error || !hasSnapshot || isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter CSV (RGPD)
                </Button>
                <Button variant="outline" size="sm" onClick={() => setExportConfirmType('json')} disabled={clients.length === 0 || loading || !!error || !hasSnapshot || isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter JSON
                </Button>
              </>
            )}
            <NewClientDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} canUseNotes={canUseClientNotes}
              trigger={<Button disabled={loading || !!error || !hasSnapshot} className="w-full sm:w-auto min-h-[44px]"><Plus className="mr-2 h-4 w-4" />Nouveau Client</Button>}
              onCreate={async input => {
                const client = await addClient(input);
                if (client) await logActivity('CLIENT_CREATED', { client_name: client.name });
                return client;
              }} />
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Rechercher un client par nom ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Nom A-Z</SelectItem>
              <SelectItem value="name-desc">Nom Z-A</SelectItem>
              <SelectItem value="newest">Plus récent</SelectItem>
              <SelectItem value="oldest">Plus ancien</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredAndSortedClients.length} affiché{filteredAndSortedClients.length !== 1 ? 's' : ''} sur {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>

        {exportError && <p role="alert" className="text-sm text-destructive">{exportError}</p>}
        {error ? (
          <div role="alert" className="rounded-xl border border-destructive/30 p-4"><p>{error}</p><Button className="mt-2" variant="outline" onClick={() => void refreshClients()}>Réessayer</Button></div>
        ) : loading || !hasSnapshot ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement des clients...</p>
          </div>
        ) : filteredAndSortedClients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Aucun client trouvé' : 'Aucun client enregistré'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[minmax(220px,1.4fr)_1fr_1.2fr_80px] gap-3 bg-slate-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 md:grid">
              <span>Client</span>
              <span>Téléphone</span>
              <span>Email / note</span>
              <span></span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredAndSortedClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  className="grid w-full gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50 md:grid-cols-[minmax(220px,1.4fr)_1fr_1.2fr_80px] md:items-center md:gap-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {client.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{client.name}</span>
                      <span className="block text-[11px] text-muted-foreground md:hidden">{client.phone}</span>
                    </span>
                  </span>
                  <span className="hidden text-sm text-slate-600 md:block">{client.phone}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-slate-600">{client.email || '—'}</span>
                    {canUseClientNotes && client.notes && (
                      <span className="block truncate text-[11px] text-slate-400">{client.notes}</span>
                    )}
                  </span>
                  <span className="hidden text-right text-xs font-semibold text-primary md:block">Ouvrir</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedClient && hasSnapshot && (
          <ClientDetailModal
            client={selectedClient}
            open={!!selectedClient}
            onClose={() => setSelectedClientId(null)}
          />
        )}

        <AlertDialog open={!!exportConfirmType} onOpenChange={(open) => !open && setExportConfirmType(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Export RGPD — Confirmation</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point de télécharger les données personnelles de vos clients. Assurez-vous de stocker ce fichier de manière sécurisée, conformément au RGPD.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isExporting}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => exportConfirmType && handleExport(exportConfirmType)} disabled={isExporting}>
                {isExporting ? 'Export en cours...' : 'Télécharger'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

function ScopedClientsWorkspace() {
  const { contextKey } = useClients();
  return <ClientsWorkspace key={contextKey || 'no-salon'} />;
}
export default function ClientsPage() {
  return <ClientsProvider><ScopedClientsWorkspace /></ClientsProvider>;
}
