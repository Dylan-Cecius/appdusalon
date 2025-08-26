import { Trash2, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface CartItem {
  id: string;
  name: string;
  price: number;
  duration: number;
  quantity: number;
}

interface CartSidebarProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: (method: 'cash' | 'card') => void;
}

const CartSidebar = ({ items, onUpdateQuantity, onRemoveItem, onCheckout }: CartSidebarProps) => {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalDuration = items.reduce((sum, item) => sum + (item.duration * item.quantity), 0);

  if (items.length === 0) {
    return (
      <Card className="p-6 h-full bg-card">
        <div className="text-center text-muted-foreground">
          <div className="mb-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 hover:scale-105 transition-transform duration-300 hover:bg-muted/80">
              <CreditCard className="h-8 w-8 transition-transform duration-300 hover:rotate-12" />
            </div>
          </div>
          <p className="text-lg font-medium">Panier vide</p>
          <p className="text-sm">Sélectionnez des services</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 h-full bg-card">
      <h2 className="text-xl font-bold mb-4 text-primary">Commande en cours</h2>
      
      <div className="flex-1 space-y-3 mb-6">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-background rounded-lg border hover:shadow-md transition-all duration-200 hover:scale-[1.01] hover:border-accent/30 group"
               style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="flex-1">
              <h3 className="font-medium group-hover:text-primary transition-colors duration-200">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.price.toFixed(2)}€</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="h-8 w-8 p-0 hover:scale-110 active:scale-95 transition-transform duration-200"
                >
                  -
                </Button>
                <span className="w-8 text-center font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="h-8 w-8 p-0 hover:scale-110 active:scale-95 transition-transform duration-200"
                >
                  +
                </Button>
              </div>
              
              <Button
                variant="destructive"
                size="sm"
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
            <span className="font-medium">{totalDuration} minutes</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Prix:</span>
            <span className="text-primary">{total.toFixed(2)}€</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={() => onCheckout('cash')}
            className="bg-pos-cash hover:bg-pos-cash/90 text-pos-success-foreground flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 hover:shadow-lg"
          >
            <Banknote className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
            Cash
          </Button>
          <Button 
            onClick={() => onCheckout('card')}
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

export default CartSidebar;