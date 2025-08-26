import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: 'coupe' | 'barbe' | 'combo' | 'produit';
  appointmentBuffer?: number;
}

interface ServiceCardProps {
  service: Service;
  onAdd: (service: Service) => void;
}

const ServiceCard = ({ service, onAdd }: ServiceCardProps) => {
  const getCategoryColor = (category: Service['category']) => {
    const colors = {
      coupe: 'bg-primary/10 text-primary',
      barbe: 'bg-accent/10 text-accent-foreground',
      combo: 'bg-pos-card/10 text-pos-card',
      produit: 'bg-pos-success/10 text-pos-success'
    };
    return colors[category] || colors.coupe;
  };

  return (
    <Card className="p-6 relative overflow-hidden group hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-card/90 via-card to-muted/30 border-2 border-border/50 hover:border-accent/60 backdrop-blur-sm hover:scale-[1.02] animate-fade-in">
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg"></div>
      
      {/* Floating sparkle effect */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
        <Sparkles className="h-4 w-4 text-accent animate-pulse" />
      </div>
      
      {/* Subtle glow border */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent/20 via-primary/10 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg blur-sm -z-10"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className={`inline-block px-3 py-1.5 rounded-full text-xs font-bold mb-3 backdrop-blur-sm border transition-all duration-300 group-hover:scale-105 ${getCategoryColor(service.category)}`}>
              {service.category.toUpperCase()}
            </div>
            <h3 className="font-bold text-xl text-foreground group-hover:text-accent transition-colors duration-300 mb-1">
              {service.name}
            </h3>
            {service.category !== 'produit' ? (
              <p className="text-sm text-muted-foreground font-medium">{service.duration} minutes</p>
            ) : (
              <p className="text-sm text-muted-foreground font-medium">Article en stock</p>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-6">
          <div className="text-3xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
            {service.price.toFixed(2)}€
          </div>
          <Button 
            onClick={() => onAdd(service)}
            size="lg"
            className="bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 font-semibold group/button"
          >
            <Plus className="h-5 w-5 mr-2 group-hover/button:rotate-90 transition-transform duration-300" />
            Ajouter
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ServiceCard;