import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import { Clock, Users, Star, Award, Scissors, Heart } from 'lucide-react';

const About = () => {
  const values = [
    {
      icon: Scissors,
      title: 'Expertise',
      description: 'Plus de 10 ans d\'expérience dans la coiffure masculine moderne'
    },
    {
      icon: Users,
      title: 'Équipe passionnée',
      description: 'Des coiffeurs qualifiés et à l\'écoute de vos envies'
    },
    {
      icon: Star,
      title: 'Qualité premium',
      description: 'Produits haut de gamme et techniques de pointe'
    },
    {
      icon: Heart,
      title: 'Service personnalisé',
      description: 'Chaque client est unique, chaque coupe est sur mesure'
    }
  ];

  const team = [
    {
      name: 'Alex',
      role: 'Coiffeur expert',
      speciality: 'Coupes modernes & barbier',
      experience: '8 ans',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      name: 'Marie',
      role: 'Styliste senior',
      speciality: 'Coupes tendance & colorations',
      experience: '6 ans',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b332c144?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    },
    {
      name: 'Thomas',
      role: 'Barbier traditionnel',
      speciality: 'Barbe à l\'ancienne & soins',
      experience: '5 ans',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">À Propos de Nous</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Découvrez l'histoire et les valeurs qui font de SalonPOS votre salon de référence
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">Notre Histoire</h2>
                <div className="prose prose-lg text-muted-foreground space-y-4">
                  <p>
                    Fondé avec la passion de la coiffure masculine, SalonPOS est né de l'envie 
                    de créer un espace moderne où tradition et innovation se rencontrent.
                  </p>
                  <p>
                    Depuis nos débuts, nous nous sommes spécialisés dans l'art de sublimer 
                    la personnalité de chaque homme à travers des coupes sur mesure et des 
                    soins de qualité premium.
                  </p>
                  <p>
                    Notre équipe de professionnels passionnés met son expertise au service 
                    de votre style, dans un environnement chaleureux et accueillant.
                  </p>
                </div>
              </div>
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Salon SalonPOS"
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute -bottom-6 -right-6 bg-primary text-primary-foreground p-6 rounded-lg shadow-lg">
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-sm opacity-90">Clients satisfaits</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Nos Valeurs</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Les principes qui guident notre travail au quotidien et font notre différence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <value.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Notre Équipe</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Rencontrez les artistes qui donneront vie à votre style
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {team.map((member, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 hover-scale">
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h3 className="text-xl font-bold text-white">{member.name}</h3>
                    <p className="text-white/90 text-sm">{member.role}</p>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Spécialité :</span>
                      <span className="text-sm font-medium">{member.speciality}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Expérience :</span>
                      <span className="text-sm font-medium">{member.experience}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10+</div>
              <div className="text-sm opacity-90">Années d'expérience</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-sm opacity-90">Clients satisfaits</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">3</div>
              <div className="text-sm opacity-90">Coiffeurs experts</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">7</div>
              <div className="text-sm opacity-90">Services proposés</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Prêt à découvrir l'expérience SalonPOS ?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Rejoignez les centaines de clients qui nous font confiance pour leur style
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/reservation">
                Réserver maintenant
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/services">
                Découvrir nos services
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

export default About;