import { useState, useMemo, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { useClients } from '@/hooks/useClients';
import { usePermissions } from '@/hooks/usePermissions';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, User, Phone, Mail, FileText, Download, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ClientDetailModal from '@/components/ClientDetailModal';
import type { Client } from '@/hooks/useClients';
import { format } from 'date-fns';

const ClientsPage = () => {
  const { clients, loading, addClient, getClientStats } = useClients();
  const { permissions } = usePermissions();
  const { salonSettings } = useSupabaseSettings();
  const { logActivity } = useActivityLog();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'newest' | 'oldest'>('name-asc');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [exportConfirmType, setExportConfirmType] = useState<'csv' | 'json' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

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

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone) return;
    
    const result = await addClient(newClient);
    if (result) {
      await logActivity('CLIENT_CREATED', { client_name: newClient.name });
    }
    setNewClient({ name: '', phone: '', email: '', notes: '' });
    setIsAddDialogOpen(false);
  };

  const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

  const handleExport = useCallback(async (type: 'csv' | 'json') => {
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
        const header = 'Nom,Téléphone,Email,Date de création,Nombre de visites,Total dépensé (€),Notes';
        const rows = clientsWithStats.map(c =>
          [
            `"${c.name}"`,
            `"${c.phone}"`,
            `"${c.email || ''}"`,
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
          date_creation: format(new Date(c.created_at), 'dd/MM/yyyy'),
          nombre_visites: c.visitCount,
          total_depense: c.totalSpent,
          notes: c.notes || null,
        }));
        const json = JSON.stringify(data, null, 2);
        downloadFile(json, `${filename}.json`, 'application/json');
      }
      await logActivity('EXPORT_RGPD', { format: type.toUpperCase(), count: clients.length });
    } finally {
      setIsExporting(false);
      setExportConfirmType(null);
    }
  }, [clients, getClientStats, salonSettings]);

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
        {/* En-tête mobile */}
        <div className="flex items-end justify-between gap-3 md:hidden">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}
            </p>
            <h1 className="text-[26px] font-bold leading-tight text-foreground">Clients</h1>
          </div>
          <button
            type="button"
            aria-label="Nouveau client"
            onClick={() => setIsAddDialogOpen(true)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground active:opacity-90"
          >
            <Plus className="h-6 w-6" strokeWidth={2.4} />
          </button>
        </div>

        <div className="hidden md:flex md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Gestion des Clients</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Gérez vos clients et leur historique</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {permissions.isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => setExportConfirmType('csv')} disabled={clients.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter CSV (RGPD)
                </Button>
                <Button variant="outline" size="sm" onClick={() => setExportConfirmType('json')} disabled={clients.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter JSON
                </Button>
              </>
            )}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto min-h-[44px]">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Client
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un client</DialogTitle>
                <DialogDescription>
                  Créez une fiche pour un nouveau client
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom complet *</Label>
                  <Input
                    id="name"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone *</Label>
                  <Input
                    id="phone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    placeholder="0123456789"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="jean@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    placeholder="Préférences, allergies, remarques..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddClient} disabled={!newClient.name || !newClient.phone}>
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground md:left-3 md:h-4 md:w-4" />
            <Input
              className="h-12 rounded-2xl bg-card pl-11 md:h-10 md:rounded-md md:bg-background md:pl-10"
              aria-label="Rechercher un client"
              placeholder="Rechercher un client par nom ou téléphone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-12 w-full rounded-2xl bg-card sm:w-[180px] md:h-10 md:rounded-md md:bg-background">
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

        {permissions.isAdmin && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
            <button
              type="button"
              onClick={() => setExportConfirmType('csv')}
              disabled={clients.length === 0}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground active:bg-muted disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </button>
            <button
              type="button"
              onClick={() => setExportConfirmType('json')}
              disabled={clients.length === 0}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground active:bg-muted disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exporter JSON
            </button>
          </div>
        )}

        <p className="hidden text-sm text-muted-foreground md:block">
          {clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
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
          <>
          {/* Liste mobile */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card md:hidden">
            {filteredAndSortedClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => setSelectedClient(client)}
                className="flex min-h-[64px] w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 active:bg-muted"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-[13px] font-bold text-ink">
                  {client.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-foreground">{client.name}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">{client.phone}</span>
                </span>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>

          <div className="hidden md:grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedClients.map((client) => (
              <Card
                key={client.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors active:scale-98 min-h-[80px]"
                onClick={() => setSelectedClient(client)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {client.name}
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </div>
                    )}
                  </CardDescription>
                </CardHeader>
                {client.notes && (
                  <CardContent>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p className="line-clamp-2">{client.notes}</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
          </>
        )}

        {selectedClient && (
          <ClientDetailModal
            client={selectedClient}
            open={!!selectedClient}
            onClose={() => setSelectedClient(null)}
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

export default ClientsPage;
