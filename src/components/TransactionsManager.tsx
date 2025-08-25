import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Transaction, useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';

interface TransactionsManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditTransactionData {
  totalAmount: string;
  paymentMethod: 'cash' | 'card';
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

const TransactionsManager = ({ isOpen, onClose }: TransactionsManagerProps) => {
  const { transactions, updateTransaction, deleteTransaction, loading } = useSupabaseTransactions();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editData, setEditData] = useState<EditTransactionData>({
    totalAmount: '',
    paymentMethod: 'cash',
    items: []
  });
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditData({
      totalAmount: transaction.totalAmount.toString(),
      paymentMethod: transaction.paymentMethod,
      items: transaction.items
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    await updateTransaction(editingTransaction.id, {
      totalAmount: parseFloat(editData.totalAmount),
      paymentMethod: editData.paymentMethod,
      items: editData.items
    });

    setEditingTransaction(null);
    setEditData({
      totalAmount: '',
      paymentMethod: 'cash',
      items: []
    });
  };

  const handleDelete = async (transactionId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      await deleteTransaction(transactionId);
    }
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditData({
      totalAmount: '',
      paymentMethod: 'cash',
      items: []
    });
  };

  const toggleDetails = (transactionId: string) => {
    setShowDetails(showDetails === transactionId ? null : transactionId);
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestion des encaissements</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestion des encaissements ({transactions.length} transactions)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune transaction enregistrée
            </div>
          ) : (
            transactions.map((transaction) => (
              <Card key={transaction.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-semibold text-lg">
                          {transaction.totalAmount.toFixed(2)}€
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(transaction.transactionDate, 'dd/MM/yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                      
                      <Badge variant={transaction.paymentMethod === 'cash' ? 'secondary' : 'default'}>
                        {transaction.paymentMethod === 'cash' ? 'Espèces' : 'Carte'}
                      </Badge>

                      <div className="text-sm text-muted-foreground">
                        {transaction.items.length} article{transaction.items.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    {showDetails === transaction.id && (
                      <div className="mt-3 p-3 bg-muted/30 rounded">
                        <h4 className="font-medium mb-2">Détails des articles:</h4>
                        <div className="space-y-1">
                          {transaction.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.name} x{item.quantity}</span>
                              <span>{(item.price * item.quantity).toFixed(2)}€</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleDetails(transaction.id)}
                    >
                      {showDetails === transaction.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(transaction)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Fermer</Button>
        </div>

        {/* Edit Dialog */}
        {editingTransaction && (
          <Dialog open={!!editingTransaction} onOpenChange={handleCancelEdit}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier la transaction</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="totalAmount">Montant total</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={editData.totalAmount}
                    onChange={(e) => setEditData({ ...editData, totalAmount: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Méthode de paiement</Label>
                  <Select value={editData.paymentMethod} onValueChange={(value: 'cash' | 'card') => 
                    setEditData({ ...editData, paymentMethod: value })
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      <SelectItem value="cash">Espèces</SelectItem>
                      <SelectItem value="card">Carte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                    Annuler
                  </Button>
                  <Button onClick={handleSaveEdit} className="flex-1">
                    Sauvegarder
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionsManager;