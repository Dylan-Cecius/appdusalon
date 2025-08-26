import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSupabaseServices, Service } from '@/hooks/useSupabaseServices';

const ServiceManagement = () => {
  const { services, loading, addService, updateService, deleteService, categories } = useSupabaseServices();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    duration: '',
    category: 'general',
    appointmentBuffer: '10'
  });

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      duration: '',
      category: 'general',
      appointmentBuffer: '10'
    });
    setEditingService(null);
  };

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        price: service.price.toString(),
        duration: service.duration.toString(),
        category: service.category,
        appointmentBuffer: service.appointmentBuffer.toString()
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price || !formData.duration) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const serviceData = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      duration: parseInt(formData.duration),
      category: formData.category,
      appointmentBuffer: parseInt(formData.appointmentBuffer) || 0,
      isActive: true,
      displayOrder: services.length + 1
    };

    try {
      if (editingService) {
        await updateService(editingService.id, serviceData);
        toast({
          title: "✅ Service modifié",
          description: `${formData.name} a été mis à jour avec succès`,
        });
      } else {
        await addService(serviceData);
        toast({
          title: "✅ Service ajouté",
          description: `${formData.name} a été ajouté à votre catalogue`,
        });
      }
      handleCloseModal();
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de sauvegarder le service",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${service.name}" ?`)) {
      return;
    }

    try {
      await deleteService(service.id);
      toast({
        title: "✅ Service supprimé",
        description: `${service.name} a été retiré du catalogue`,
      });
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer le service",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Package className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary">Gestion des Services</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez, modifiez ou supprimez les services de votre salon
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau service
          </Button>
        </div>

        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium">{service.name}</h4>
                  <span className="px-2 py-1 bg-muted rounded-full text-xs">
                    {categories.find(c => c.id === service.category)?.name || service.category}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {service.price.toFixed(2)}€ • {service.duration} min
                  {service.appointmentBuffer > 0 && ` • +${service.appointmentBuffer} min buffer`}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal(service)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(service)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {services.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun service configuré</p>
              <p className="text-sm">Ajoutez votre premier service pour commencer</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modal d'ajout/modification */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Modifier le service' : 'Nouveau service'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du service *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Coupe Homme"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Prix (€) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="18.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration">Durée (min) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="30"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Catégorie</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="buffer">Temps de préparation (min)</Label>
              <Input
                id="buffer"
                type="number"
                min="0"
                value={formData.appointmentBuffer}
                onChange={(e) => setFormData({ ...formData, appointmentBuffer: e.target.value })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Temps supplémentaire entre les rendez-vous pour la préparation
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
                {editingService ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceManagement;