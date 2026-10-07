import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useClients, type Client, type ClientStats } from '@/hooks/useClients';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Edit2, Save, X, DollarSign, Calendar, Clock, Trash2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionRights } from '@/hooks/useSubscriptionRights';
interface ClientDetailModalProps {
  client: Client;
  open: boolean;
  onClose: () => void;
}

const ClientDetailModal = ({ client, open, onClose }: ClientDetailModalProps) => {
  const { updateClient, getClientStats, refreshClients } = useClients();
  const { transactions } = useSupabaseTransactions();
  const { appointments } = useSupabaseAppointments();
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const { rights } = useSubscriptionRights();
  const canUseClientNotes = rights.canAccessFullClientNotes;
  const { logActivity } = useActivityLog();
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<ClientStats>({ totalSpent: 0, visitCount: 0, lastVisit: null });
  const [editedClient, setEditedClient] = useState(client);
  const [rgpdConfirmName, setRgpdConfirmName] = useState('');
  const [isRgpdDeleting, setIsRgpdDeleting] = useState(false);
  const [rgpdDialogOpen, setRgpdDialogOpen] = useState(false);

  useEffect(() => {
    if (open && client) {
      setEditedClient(client);
      loadStats();
    }
  }, [open, client]);

  useEffect(() => {
    if (!rgpdDialogOpen) {
      setRgpdConfirmName('');
    }
  }, [rgpdDialogOpen]);

  const loadStats = async () => {
    const clientStats = await getClientStats(client.id);
    setStats(clientStats);
  };

  const handleSave = async () => {
    const updates = canUseClientNotes
      ? editedClient
      : {
          ...editedClient,
          notes: client.notes,
        };

    await updateClient(client.id, updates);
    setIsEditing(false);
  };

  const handleRgpdDelete = async () => {
    setIsRgpdDeleting(true);
    try {
      const { error } = await supabase.rpc('erase_client_personal_data', {
        client_id_param: client.id,
      });
      if (error) throw error;

      await logActivity('CLIENT_DELETED', {
        erased_client_id: client.id,
        mode: 'rgpd_erasure',
      });
      await refreshClients();

      toast({
        title: "Données personnelles effacées",
        description: "La fiche client a été supprimée. Les écritures comptables sont conservées sans lien vers le client.",
      });
      setRgpdDialogOpen(false);
      onClose();
    } catch (error) {
      console.error('RGPD client erasure failed:', error);
      toast({
        title: "Erreur",
        description: "Impossible d’effacer les données personnelles",
        variant: "destructive",
      });
    } finally {
      setIsRgpdDeleting(false);
    }
  };

  const clientTransactions = transactions.filter(t => t.clientId === client.id);
  const clientAppointments = appointments.filter(apt => apt.clientPhone === client.phone);

  const allVisits = [
    ...clientTransactions.map(t => ({
      id: t.id,
      date: new Date(t.transactionDate),
      type: 'transaction' as const,
      amount: t.totalAmount,
      items: t.items,
    })),
    ...clientAppointments.map(apt => ({
      id: apt.id,
      date: new Date(apt.startTime),
      type: 'appointment' as const,
      amount: apt.totalPrice,
      services: apt.services,
      isPaid: apt.isPaid,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Fiche Client</span>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" />
                    Enregistrer
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            Informations détaillées et historique
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="stats">Statistiques</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Nom complet</Label>
                <Input
                  value={editedClient.name}
                  onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={editedClient.phone}
                  onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editedClient.email || ''}
                  onChange={(e) => setEditedClient({ ...editedClient, email: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              {canUseClientNotes ? (
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={editedClient.notes || ''}
                    onChange={(e) => setEditedClient({ ...editedClient, notes: e.target.value })}
                    disabled={!isEditing}
                    rows={5}
                    placeholder="Préférences, allergies, remarques..."
                  />
                </div>
              ) : (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Les notes client complètes sont disponibles à partir du plan Solo.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total dépensé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalSpent.toFixed(2)} €</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Nombre de visites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.visitCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Dernière visite
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">
                    {stats.lastVisit
                      ? format(new Date(stats.lastVisit), 'dd MMM yyyy', { locale: fr })
                      : 'Jamais'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-3">
              {allVisits.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Aucun historique de visite
                  </CardContent>
                </Card>
              ) : (
                allVisits.map((visit) => (
                  <Card key={`${visit.type}-${visit.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          {format(visit.date, 'EEEE dd MMMM yyyy • HH:mm', { locale: fr })}
                        </CardTitle>
                        <span className="text-lg font-bold text-primary">
                          {visit.amount.toFixed(2)} €
                        </span>
                      </div>
                      <CardDescription>
                        {visit.type === 'transaction' ? (
                          <div className="space-y-1">
                            {visit.items.map((item: any, idx: number) => (
                              <div key={idx} className="text-xs">
                                • {item.name} ({item.quantity}x)
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {visit.services.map((service: any, idx: number) => (
                              <div key={idx} className="text-xs">
                                • {service.name}
                              </div>
                            ))}
                            {!visit.isPaid && (
                              <span className="text-xs text-destructive">Non payé</span>
                            )}
                          </div>
                        )}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {permissions.isAdmin && (
          <>
            <Separator className="my-4" />
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-5 w-5" />
                <span className="font-semibold text-sm">Droit à l'oubli — RGPD Article 17</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Effacement définitif des données personnelles. Les écritures comptables sont conservées mais dissociées du client.
              </p>
              <AlertDialog open={rgpdDialogOpen} onOpenChange={setRgpdDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer définitivement ce client
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5" />
                      Suppression RGPD irréversible
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <span className="block">
                        Cette action est irréversible. La fiche de <strong>{client.name}</strong>, les coordonnées présentes dans les rendez-vous et les journaux SMS seront effacés. Les transactions financières resteront conservées mais ne seront plus liées au client.
                      </span>
                      <span className="block text-sm">
                        Pour confirmer, tapez <strong>{client.name}</strong> ci-dessous :
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <Input
                    placeholder={client.name}
                    value={rgpdConfirmName}
                    onChange={(e) => setRgpdConfirmName(e.target.value)}
                    className="mt-2"
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isRgpdDeleting}>Annuler</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      disabled={rgpdConfirmName !== client.name || isRgpdDeleting}
                      onClick={handleRgpdDelete}
                    >
                      {isRgpdDeleting ? 'Suppression...' : 'Supprimer définitivement'}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailModal;
