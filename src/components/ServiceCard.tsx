import { Plus } from "lucide-react";
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
    <Card className="p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 bg-card border-2 hover:border-accent/50 group cursor-pointer">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 transition-all duration-200 group-hover:scale-105 ${getCategoryColor(service.category)}`}>
            {service.category.toUpperCase()}
          </div>
          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors duration-200">
            {service.name}
          </h3>
          {service.category !== 'produit' ? (
            <p className="text-sm text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-200">{service.duration} min</p>
          ) : (
            <p className="text-sm text-muted-foreground group-hover:text-muted-foreground/80 transition-colors duration-200">Produit</p>
          )}
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-2xl font-bold text-primary group-hover:scale-105 transition-transform duration-200">
          {service.price.toFixed(2)}€
        </div>
        <Button 
          onClick={() => onAdd(service)}
          size="sm"
          className="bg-yellow-500 hover:bg-yellow-600 text-yellow-950 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Plus className="h-4 w-4 mr-1 transition-transform duration-200 group-hover:rotate-90" />
          Ajouter
        </Button>
      </div>
    </Card>
  );
};

export default ServiceCard;