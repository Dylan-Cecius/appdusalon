import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, ShoppingBag } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSupabaseServices, Service } from '@/hooks/useSupabaseServices';

const ProductManagement = () => {
  const { services, loading, addService, updateService, deleteService } = useSupabaseServices();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: ''
  });

  // Filter only products from services
  const products = services.filter(service => service.category === 'produit');

  const resetForm = () => {
    setFormData({
      name: '',
      price: ''
    });
    setEditingProduct(null);
  };

  const handleOpenModal = (product?: Service) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        price: product.price.toString()
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
    
    if (!formData.name.trim() || !formData.price) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const productData = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      duration: 0, // Products don't have duration
      category: 'produit',
      appointmentBuffer: 0, // Products don't need buffer time
      isActive: true,
      displayOrder: products.length + 1
    };

    try {
      if (editingProduct) {
        await updateService(editingProduct.id, productData);
        toast({
          title: "✅ Produit modifié",
          description: `${formData.name} a été mis à jour avec succès`,
        });
      } else {
        await addService(productData);
        toast({
          title: "✅ Produit ajouté",
          description: `${formData.name} a été ajouté à votre catalogue`,
        });
      }
      handleCloseModal();
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de sauvegarder le produit",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (product: Service) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${product.name}" ?`)) {
      return;
    }

    try {
      await deleteService(product.id);
      toast({
        title: "✅ Produit supprimé",
        description: `${product.name} a été retiré du catalogue`,
      });
    } catch (error) {
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer le produit",
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
            <div className="p-2 bg-secondary/10 rounded-lg">
              <ShoppingBag className="h-6 w-6 text-secondary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-primary">Gestion des Produits</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez, modifiez ou supprimez les produits de votre salon
              </p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau produit
          </Button>
        </div>

        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium">{product.name}</h4>
                  <span className="px-2 py-1 bg-secondary/20 rounded-full text-xs text-secondary-foreground">
                    Produit
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {product.price.toFixed(2)}€
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenModal(product)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(product)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {products.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun produit configuré</p>
              <p className="text-sm">Ajoutez votre premier produit pour commencer</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modal d'ajout/modification */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Shampooing, Cire coiffante..."
                required
              />
            </div>

            <div>
              <Label htmlFor="price">Prix (€) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="12.50"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                {editingProduct ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;