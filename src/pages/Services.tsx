import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import { Clock, Euro, Scissors, Users, Star } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  appointmentBuffer?: number;
}

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/get-services');
        const data = await response.json();
        setServices(data.services || []);
      } catch (error) {
        console.error('Erreur lors du chargement des services:', error);
        // Fallback avec des services par défaut
        setServices([
          { id: '1', name: 'Coupe Homme', price: 18, duration: 30, category: 'coupe', appointmentBuffer: 10 },
          { id: '2', name: 'Coupe Enfant', price: 16, duration: 25, category: 'coupe', appointmentBuffer: 5 },
          { id: '3', name: 'Barbe', price: 10, duration: 15, category: 'barbe', appointmentBuffer: 5 },
          { id: '4', name: 'Barbe à l\'Ancienne', price: 15, duration: 25, category: 'barbe', appointmentBuffer: 10 },
          { id: '5', name: 'Coupe + Barbe', price: 23, duration: 40, category: 'combo', appointmentBuffer: 15 },
          { id: '6', name: 'Coupe + Barbe à l\'Ancienne', price: 28, duration: 50, category: 'combo', appointmentBuffer: 15 },
          { id: '7', name: 'Double Ancienne', price: 32, duration: 60, category: 'combo', appointmentBuffer: 20 }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'coupe':
        return {
          title: 'Coupes',
          description: 'Coiffures modernes et tendances adaptées à votre style',
          icon: Scissors,
          color: 'bg-blue-500'
        };
      case 'barbe':
        return {
          title: 'Barbes',
          description: 'Taille et entretien professionnel de votre barbe',
          icon: Users,
          color: 'bg-green-500'
        };
      case 'combo':
        return {
          title: 'Formules Complètes',
          description: 'Coupe et barbe pour un look complet et harmonieux',
          icon: Star,
          color: 'bg-purple-500'
        };
      default:
        return {
          title: 'Autres',
          description: 'Services additionnels',
          icon: Scissors,
          color: 'bg-gray-500'
        };
    }
  };

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-24 pb-12">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-300 rounded w-64 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-300 rounded w-96 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Nos Services</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Découvrez notre gamme complète de services professionnels, adaptés à tous vos besoins
            </p>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/reservation">
                Réserver maintenant
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          {Object.entries(groupedServices).map(([category, categoryServices]) => {
            const categoryInfo = getCategoryInfo(category);
            const IconComponent = categoryInfo.icon;
            
            return (
              <div key={category} className="mb-16">
                {/* Category Header */}
                <div className="text-center mb-12">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${categoryInfo.color} text-white mb-4`}>
                    <IconComponent className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4">{categoryInfo.title}</h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {categoryInfo.description}
                  </p>
                </div>

                {/* Services Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {categoryServices.map((service) => (
                    <Card key={service.id} className="hover:shadow-lg transition-shadow duration-300 hover-scale">
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-xl">{service.name}</CardTitle>
                          <Badge variant="secondary" className="ml-2">
                            {service.price.toFixed(2)}€
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {service.duration} min
                          </div>
                          <div className="flex items-center">
                            <Euro className="w-4 h-4 mr-1" />
                            {service.price.toFixed(2)}
                          </div>
                        </div>
                        
                        {service.appointmentBuffer && service.appointmentBuffer > 0 && (
                          <p className="text-xs text-muted-foreground mb-4">
                            + {service.appointmentBuffer} min de préparation inclus
                          </p>
                        )}

                        <Button asChild className="w-full bg-primary hover:bg-primary/90">
                          <Link to={`/reservation?service=${service.id}`}>
                            Réserver ce service
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Vous hésitez encore ?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Nos coiffeurs experts sont là pour vous conseiller et vous offrir le service qui vous convient le mieux.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/reservation">
                Prendre rendez-vous
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/contact">
                Nous contacter
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Floating CTA Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90">
          <Link to="/reservation" className="px-6 py-3">
            <Clock className="w-5 h-5 mr-2" />
            PRENDRE RDV
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Services;