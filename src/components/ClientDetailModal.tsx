import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClients, type Client, type ClientStats } from '@/hooks/useClients';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { Edit2, Save, X, DollarSign, Calendar, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ClientDetailModalProps {
  client: Client;
  open: boolean;
  onClose: () => void;
}

const ClientDetailModal = ({ client, open, onClose }: ClientDetailModalProps) => {
  const { updateClient, deleteClient, getClientStats } = useClients();
  const { transactions } = useSupabaseTransactions();
  const { appointments } = useSupabaseAppointments();
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<ClientStats>({ totalSpent: 0, visitCount: 0, lastVisit: null });
  const [editedClient, setEditedClient] = useState(client);

  useEffect(() => {
    if (open && client) {
      setEditedClient(client);
      loadStats();
    }
  }, [open, client]);

  const loadStats = async () => {
    const clientStats = await getClientStats(client.id);
    setStats(clientStats);
  };

  const handleSave = async () => {
    await updateClient(client.id, editedClient);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteClient(client.id);
    onClose();
  };

  const clientTransactions = transactions.filter(t => (t as any).client_id === client.id);
  const clientAppointments = appointments.filter(apt => 
    (apt as any).client_phone === client.phone
  );

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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Supprimer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Les transactions associées à ce client seront conservées mais ne seront plus liées à une fiche client.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailModal;
