import { Trash2, CreditCard, Banknote, ShoppingBag, Sparkles } from "lucide-react";
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
      <Card className="p-8 h-full bg-gradient-to-br from-card/80 via-card to-muted/30 backdrop-blur-sm border-2 border-border/50 relative overflow-hidden animate-fade-in">
        {/* Empty state background effects */}  
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 rounded-lg"></div>
        <div className="absolute top-4 right-4 animate-float delay-300">
          <Sparkles className="h-6 w-6 text-accent/30" />
        </div>
        
        <div className="text-center text-muted-foreground relative z-10">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-accent/20 animate-pulse">
              <ShoppingBag className="h-10 w-10 text-accent" />
            </div>
          </div>
          <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Panier vide
          </h3>
          <p className="text-muted-foreground">Sélectionnez des services pour commencer</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 h-full bg-gradient-to-br from-card/80 via-card to-muted/30 backdrop-blur-sm border-2 border-border/50 relative overflow-hidden animate-fade-in">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 rounded-lg"></div>
      <div className="absolute top-2 right-2 animate-float delay-500">
        <Sparkles className="h-4 w-4 text-accent/40" />
      </div>
      
      <div className="relative z-10">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-accent" />
          Commande en cours
        </h2>
        
        <div className="flex-1 space-y-4 mb-6">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-4 bg-gradient-to-r from-background/90 to-background/70 rounded-xl border-2 border-border/50 hover:border-accent/30 transition-all duration-300 backdrop-blur-sm hover:shadow-lg animate-fade-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex-1">
                <h3 className="font-semibold text-lg group-hover:text-accent transition-colors duration-200">{item.name}</h3>
                <p className="text-muted-foreground font-medium">{item.price.toFixed(2)}€</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1 backdrop-blur-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground transition-all duration-200"
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-bold text-primary">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground transition-all duration-200"
                  >
                    +
                  </Button>
                </div>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRemoveItem(item.id)}
                  className="h-10 w-10 p-0 hover:scale-110 transition-transform duration-200 shadow-md"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Separator className="my-6 bg-gradient-to-r from-transparent via-border to-transparent" />
        
        <div className="space-y-6">
          <div className="space-y-4 p-4 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 rounded-xl backdrop-blur-sm border border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Durée totale:</span>
              <span className="font-bold text-lg text-accent">{totalDuration} min</span>
            </div>
            <div className="flex justify-between items-center text-2xl font-black">
              <span>Total:</span>
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {total.toFixed(2)}€
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button 
              onClick={() => onCheckout('cash')}
              className="h-14 bg-gradient-to-r from-pos-cash to-pos-cash/80 hover:from-pos-cash/90 hover:to-pos-cash/70 text-pos-success-foreground flex items-center gap-3 font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <Banknote className="h-5 w-5" />
              Cash
            </Button>
            <Button 
              onClick={() => onCheckout('card')}
              className="h-14 bg-gradient-to-r from-pos-card to-pos-card/80 hover:from-pos-card/90 hover:to-pos-card/70 text-white flex items-center gap-3 font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <CreditCard className="h-5 w-5" />
              Bancontact
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CartSidebar;