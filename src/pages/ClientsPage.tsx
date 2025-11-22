import { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { useClients } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, User, Phone, Mail, FileText } from 'lucide-react';
import ClientDetailModal from '@/components/ClientDetailModal';
import type { Client } from '@/hooks/useClients';

const ClientsPage = () => {
  const { clients, loading, addClient } = useClients();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  );

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone) return;
    
    await addClient(newClient);
    setNewClient({ name: '', phone: '', email: '', notes: '' });
    setIsAddDialogOpen(false);
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gestion des Clients</h1>
            <p className="text-muted-foreground">Gérez vos clients et leur historique</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
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

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Rechercher un client par nom ou téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chargement des clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Aucun client trouvé' : 'Aucun client enregistré'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
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
        )}

        {selectedClient && (
          <ClientDetailModal
            client={selectedClient}
            open={!!selectedClient}
            onClose={() => setSelectedClient(null)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default ClientsPage;
