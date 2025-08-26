import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Navigation from '@/components/Navigation';
import { Scissors, Users, Clock, Star, ChevronDown } from 'lucide-react';

const Home = () => {
  const services = [
    {
      id: 'coupes',
      title: 'Coupes',
      description: 'Coiffure moderne et tendance pour tous les styles',
      icon: Scissors,
      image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'barbes',
      title: 'Barbes',
      description: 'Taille et entretien de barbe professionnels',
      icon: Users,
      image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'combos',
      title: 'Formules complètes',
      description: 'Coupe + barbe pour un look complet',
      icon: Star,
      image: 'https://images.unsplash.com/photo-1599351431613-67001ceaafdc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    }
  ];

  const stats = [
    { label: 'Clients satisfaits', value: '500+' },
    { label: 'Années d\'expérience', value: '10+' },
    { label: 'Coiffeurs experts', value: '3' },
    { label: 'Services disponibles', value: '7' }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)'
          }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            RÉSERVE EN LIGNE ET<br />
            DÉCOUVRE L'EXPÉRIENCE<br />
            <span className="text-primary">SALONPOS</span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-8 text-gray-200 animate-fade-in">
            Ton style, notre expertise : pour une coiffure à ton image
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg">
              <Link to="/services">
                SERVICES
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black px-8 py-6 text-lg">
              <Link to="/reservation">
                RÉSERVATION EN LIGNE
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/10 px-8 py-6 text-lg">
              <Link to="/a-propos">
                À PROPOS
              </Link>
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="text-white w-8 h-8" />
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-4xl font-bold mb-6">Ton style, notre expertise : pour une coiffure à ton image</h2>
            <p className="text-xl text-muted-foreground mb-6">
              Nos membres d'équipe sont à la pointe. Mais ça, tu le savais déjà.
            </p>
            <p className="text-lg text-muted-foreground">
              Salon moderne et accueillant, nous avons transmis notre niveau de qualité à toute notre équipe pour vous offrir une expérience unique.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Nos Services</h2>
            <p className="text-xl text-muted-foreground">Découvrez notre gamme complète de services professionnels</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {services.map((service) => (
              <Card key={service.id} className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover-scale">
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={service.image} 
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300"></div>
                  <div className="absolute bottom-4 left-4">
                    <service.icon className="w-8 h-8 text-white mb-2" />
                    <h3 className="text-2xl font-bold text-white">{service.title}</h3>
                  </div>
                </div>
                <CardContent className="p-6">
                  <p className="text-muted-foreground mb-4">{service.description}</p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/services">
                      Voir les détails
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/services">
                Voir tous nos services
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Prêt pour votre nouvelle coupe ?</h2>
          <p className="text-xl mb-8 opacity-90">
            Réservez votre créneau en quelques clics et découvrez l'expérience SalonPOS
          </p>
          <Button asChild size="lg" variant="secondary" className="px-12 py-6 text-lg">
            <Link to="/reservation">
              Réserver maintenant
            </Link>
          </Button>
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

export default Home;