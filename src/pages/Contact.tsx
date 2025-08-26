import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import { MapPin, Phone, Mail, Clock, Calendar } from 'lucide-react';

const Contact = () => {
  const contactInfo = [
    {
      icon: MapPin,
      title: 'Adresse',
      details: ['123 Rue de la Coiffure', '75001 Paris, France'],
      link: 'https://maps.google.com'
    },
    {
      icon: Phone,
      title: 'Téléphone',
      details: ['+33 1 23 45 67 89'],
      link: 'tel:+33123456789'
    },
    {
      icon: Mail,
      title: 'Email',
      details: ['contact@salonpos.fr'],
      link: 'mailto:contact@salonpos.fr'
    },
    {
      icon: Clock,
      title: 'Horaires',
      details: [
        'Lun-Ven: 10h00 - 19h00',
        'Samedi: 10h00 - 18h00',
        'Dimanche: Fermé'
      ]
    }
  ];

  const faq = [
    {
      question: 'Comment prendre rendez-vous ?',
      answer: 'Vous pouvez réserver en ligne via notre système de réservation ou nous appeler directement.'
    },
    {
      question: 'Puis-je annuler ou modifier mon rendez-vous ?',
      answer: 'Oui, appelez-nous au moins 2 heures avant votre rendez-vous pour toute modification.'
    },
    {
      question: 'Quels moyens de paiement acceptez-vous ?',
      answer: 'Nous acceptons les espèces, cartes bancaires et paiements sans contact.'
    },
    {
      question: 'Proposez-vous des services pour enfants ?',
      answer: 'Oui, nous avons une coupe spéciale enfant adaptée aux plus jeunes.'
    },
    {
      question: 'Utilisez-vous des produits bio ?',
      answer: 'Nous proposons une gamme de produits bio et naturels sur demande.'
    }
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Contactez-nous</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Une question ? Un rendez-vous ? Nous sommes là pour vous accompagner
            </p>
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/reservation">
                Réserver en ligne
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {contactInfo.map((info, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <info.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{info.title}</h3>
                  <div className="space-y-1">
                    {info.details.map((detail, idx) => (
                      <p key={idx} className="text-muted-foreground text-sm">
                        {info.link && idx === 0 ? (
                          <a 
                            href={info.link} 
                            className="hover:text-primary transition-colors"
                            target={info.link.startsWith('http') ? '_blank' : undefined}
                            rel={info.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                          >
                            {detail}
                          </a>
                        ) : (
                          detail
                        )}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Notre Localisation</h2>
              <p className="text-lg text-muted-foreground">
                Situé au cœur de Paris, facilement accessible en métro
              </p>
            </div>
            
            {/* Placeholder for map - In a real app, you would use Google Maps or similar */}
            <div className="bg-gray-200 h-80 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-600">
                <MapPin className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg font-medium">Carte interactive</p>
                <p className="text-sm">123 Rue de la Coiffure, 75001 Paris</p>
                <Button asChild className="mt-4" variant="outline">
                  <a 
                    href="https://maps.google.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    Voir sur Google Maps
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Questions Fréquentes</h2>
              <p className="text-lg text-muted-foreground">
                Trouvez rapidement les réponses à vos questions
              </p>
            </div>

            <div className="space-y-6">
              {faq.map((item, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{item.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">Actions Rapides</h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Choisissez l'action qui vous convient le mieux
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card className="bg-white/10 border-white/20 text-center">
                <CardContent className="p-6">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-secondary" />
                  <h3 className="text-xl font-semibold mb-3">Réserver en ligne</h3>
                  <p className="opacity-90 mb-4">
                    Système de réservation simple et rapide
                  </p>
                  <Button asChild variant="secondary" className="w-full">
                    <Link to="/reservation">
                      Réserver maintenant
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20 text-center">
                <CardContent className="p-6">
                  <Phone className="w-12 h-12 mx-auto mb-4 text-secondary" />
                  <h3 className="text-xl font-semibold mb-3">Appeler directement</h3>
                  <p className="opacity-90 mb-4">
                    Parlez directement à notre équipe
                  </p>
                  <Button asChild variant="secondary" className="w-full">
                    <a href="tel:+33123456789">
                      +33 1 23 45 67 89
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20 text-center">
                <CardContent className="p-6">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-secondary" />
                  <h3 className="text-xl font-semibold mb-3">Nous écrire</h3>
                  <p className="opacity-90 mb-4">
                    Posez vos questions par email
                  </p>
                  <Button asChild variant="secondary" className="w-full">
                    <a href="mailto:contact@salonpos.fr">
                      Envoyer un email
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
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

export default Contact;