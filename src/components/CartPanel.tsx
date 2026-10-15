import { useEffect, useId, useRef } from "react";
import { Trash2, CreditCard, Banknote, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  duration: number;
  quantity: number;
  kind?: 'service' | 'product';
  stock?: number;
}

export interface CartPanelProps {
  activeStaff: Array<{ id: string; name: string; role: string; color: string }>;
  selectedStaffId?: string;
  onStaffChange: (id: string) => void;
  processing?: boolean;
  error?: string | null;
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: (method: 'cash' | 'card', staffId?: string) => void;
}

const CartPanel = ({ activeStaff, selectedStaffId, onStaffChange, processing = false, error, items, onUpdateQuantity, onRemoveItem, onCheckout }: CartPanelProps) => {
  const staffInputId = useId();
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDuration = items.reduce(
    (sum, item) => sum + (item.kind === 'product' ? 0 : item.duration * item.quantity),
    0
  );

  if (items.length === 0) {
    return (
      <Card className="cart-touch-controls min-w-0 bg-card p-3 sm:p-6" aria-busy={processing}>
        <div className="text-center text-muted-foreground">
          <div className="mb-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 hover:scale-105 transition-transform duration-300 hover:bg-muted/80">
              <CreditCard className="h-8 w-8 transition-transform duration-300 hover:rotate-12" />
            </div>
          </div>
          <p className="text-lg font-medium">Panier vide</p>
          <p className="text-sm">Sélectionnez des services ou produits</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="cart-touch-controls min-w-0 bg-card p-3 sm:p-6" aria-busy={processing}>
      {processing && <p role="status" className="mb-3 text-sm text-muted-foreground">Enregistrement en cours…</p>}
      {error && <p role="alert" ref={errorRef} tabIndex={-1} className="mb-3 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
      <h2 className="text-xl font-bold mb-4 text-primary">Commande en cours</h2>
      
      <div className="flex-1 space-y-3 mb-6">
        {items.map((item, index) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-background rounded-lg border hover:shadow-md transition-all duration-200 hover:scale-[1.01] hover:border-accent/30 group"
               style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="min-w-0 flex-[1_1_140px]">
              <h3 className="font-medium [overflow-wrap:anywhere] group-hover:text-primary transition-colors duration-200">{item.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-sm text-muted-foreground">
                  {item.price.toFixed(2)}€ × {item.quantity}
                </p>
                <span className="text-xs text-muted-foreground">•</span>
                <p className="text-sm text-muted-foreground">
                  {item.kind === 'product' ? 'Produit' : `${item.duration} min`}
                </p>
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={processing}
                  aria-label={`Diminuer la quantité de ${item.name}`}
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="h-7 w-7 p-0 hover:bg-primary/10 hover:scale-110 active:scale-95 transition-all duration-200"
                >
                  -
                </Button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Augmenter la quantité de ${item.name}`}
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  disabled={processing || (item.kind === 'product' && item.stock !== undefined && item.quantity >= item.stock)}
                  className="h-7 w-7 p-0 hover:bg-primary/10 hover:scale-110 active:scale-95 transition-all duration-200"
                >
                  +
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={processing}
                aria-label={`Retirer ${item.name} du panier`}
                onClick={() => onRemoveItem(item.id)}
                className="h-8 w-8 p-0 hover:scale-110 active:scale-95 transition-all duration-200"
              >
                <Trash2 className="h-4 w-4 hover:rotate-12 transition-transform duration-200" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-4" />
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="font-medium">{totalDuration > 0 ? `${totalDuration} minutes` : '—'}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Prix:</span>
            <span className="text-primary">{total.toFixed(2)}€</span>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor={staffInputId} className="text-sm font-medium mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Prestataire (optionnel)
          </label>
          <Select disabled={processing} value={selectedStaffId} onValueChange={onStaffChange}>
            <SelectTrigger id={staffInputId}>
              <SelectValue placeholder="Sélectionner un prestataire" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sans prestataire</SelectItem>
              {activeStaff.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    {member.name} — {member.role}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
          <Button 
            disabled={processing}
            onClick={() => onCheckout('cash', selectedStaffId === 'none' ? undefined : selectedStaffId)}
            className="bg-pos-cash hover:bg-pos-cash/90 text-pos-success-foreground flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 hover:shadow-lg"
          >
            <Banknote className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
            Cash
          </Button>
          <Button 
            disabled={processing}
            onClick={() => onCheckout('card', selectedStaffId === 'none' ? undefined : selectedStaffId)}
            className="bg-pos-card hover:bg-pos-card/90 text-white flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 hover:shadow-lg"
          >
            <CreditCard className="h-4 w-4 transition-transform duration-200 hover:-rotate-12" />
            Bancontact
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default CartPanel;
