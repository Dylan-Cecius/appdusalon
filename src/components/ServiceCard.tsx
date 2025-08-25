import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: 'coupe' | 'barbe' | 'soin' | 'combo';
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
      soin: 'bg-pos-success/10 text-pos-success',
      combo: 'bg-pos-card/10 text-pos-card'
    };
    return colors[category] || colors.coupe;
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card to-muted/20 border-2 hover:border-accent/50 group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getCategoryColor(service.category)}`}>
            {service.category.toUpperCase()}
          </div>
          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
            {service.name}
          </h3>
          <p className="text-sm text-muted-foreground">{service.duration} min</p>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-2xl font-bold text-primary">
          {service.price.toFixed(2)}€
        </div>
        <Button 
          onClick={() => onAdd(service)}
          size="sm"
          className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>
    </Card>
  );
};

export default ServiceCard;