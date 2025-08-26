import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import { CalendarIcon, Clock, User, Phone, Mail, MessageSquare, Euro, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
}

interface Barber {
  id: string;
  name: string;
  working_days: string[];
  work_hours: {
    start: string;
    end: string;
  };
  color: string;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  time_display: string;
}

interface AvailableSlot {
  barber_id: string;
  barber_name: string;
  slots: TimeSlot[];
}

const Booking = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [clientInfo, setClientInfo] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  // Load services and barbers on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [servicesResponse, barbersResponse] = await Promise.all([
          fetch('https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/get-services'),
          fetch('https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/get-barbers')
        ]);

        const servicesData = await servicesResponse.json();
        const barbersData = await barbersResponse.json();

        setServices(servicesData.services || []);
        setBarbers(barbersData.barbers || []);
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les données. Veuillez réessayer.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [toast]);

  // Load available slots when date and barber are selected
  useEffect(() => {
    if (selectedDate && selectedBarber && selectedServices.length > 0) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedBarber, selectedServices]);

  const loadAvailableSlots = async () => {
    if (!selectedDate || !selectedBarber || selectedServices.length === 0) return;

    setLoading(true);
    try {
      const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      const response = await fetch(
        `https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/get-available-slots?date=${dateString}&barberId=${selectedBarber.id}&serviceDuration=${totalDuration}`
      );
      
      const data = await response.json();
      setAvailableSlots(data.available_slots || []);
    } catch (error) {
      console.error('Erreur lors du chargement des créneaux:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les créneaux disponibles.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const isSelected = prev.find(s => s.id === service.id);
      if (isSelected) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
    // Reset time slot when services change
    setSelectedTimeSlot(null);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((sum, service) => sum + service.price, 0);
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((sum, service) => sum + service.duration, 0);
  };

  const handleSubmit = async () => {
    if (!selectedServices.length || !selectedBarber || !selectedDate || !selectedTimeSlot || !clientInfo.name || !clientInfo.phone) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/create-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: clientInfo.name,
          client_phone: clientInfo.phone,
          client_email: clientInfo.email || undefined,
          barber_id: selectedBarber.id,
          start_time: selectedTimeSlot.start_time,
          end_time: selectedTimeSlot.end_time,
          services: selectedServices,
          notes: clientInfo.notes || undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Réservation confirmée !",
          description: data.message || "Votre rendez-vous a été créé avec succès.",
        });
        setStep(5); // Success step
      } else {
        throw new Error(data.error || 'Erreur lors de la création de la réservation');
      }
    } catch (error) {
      console.error('Erreur lors de la réservation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la réservation. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1: return selectedServices.length > 0;
      case 2: return selectedBarber !== null;
      case 3: return selectedDate !== undefined && selectedTimeSlot !== null;
      case 4: return clientInfo.name && clientInfo.phone;
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Choisissez vos services</h2>
            <div className="grid gap-4">
              {services.map(service => (
                <Card 
                  key={service.id} 
                  className={`cursor-pointer transition-all ${
                    selectedServices.find(s => s.id === service.id) 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => toggleService(service)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{service.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {service.duration} min
                          </span>
                          <span className="flex items-center">
                            <Euro className="w-4 h-4 mr-1" />
                            {service.price.toFixed(2)}€
                          </span>
                        </div>
                      </div>
                      {selectedServices.find(s => s.id === service.id) && (
                        <Check className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {selectedServices.length > 0 && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2">Récapitulatif :</h3>
                <div className="space-y-1 text-sm">
                  {selectedServices.map(service => (
                    <div key={service.id} className="flex justify-between">
                      <span>{service.name}</span>
                      <span>{service.price.toFixed(2)}€</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 font-medium flex justify-between">
                    <span>Total : {getTotalDuration()} min</span>
                    <span>{getTotalPrice().toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Choisissez votre coiffeur</h2>
            <div className="grid gap-4">
              {barbers.map(barber => (
                <Card 
                  key={barber.id}
                  className={`cursor-pointer transition-all ${
                    selectedBarber?.id === barber.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedBarber(barber)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${barber.color}`}></div>
                        <div>
                          <h3 className="font-medium">{barber.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {barber.work_hours.start} - {barber.work_hours.end}
                          </p>
                        </div>
                      </div>
                      {selectedBarber?.id === barber.id && (
                        <Check className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Choisissez votre créneau</h2>
            
            {/* Date Selection */}
            <div className="mb-6">
              <Label className="text-base font-medium mb-3 block">Date du rendez-vous</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPPP', { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Slots */}
            {selectedDate && selectedBarber && (
              <div>
                <Label className="text-base font-medium mb-3 block">Créneaux disponibles</Label>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Chargement des créneaux...</span>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {availableSlots.find(slot => slot.barber_id === selectedBarber.id)?.slots.map((slot, index) => (
                      <Button
                        key={index}
                        variant={selectedTimeSlot?.start_time === slot.start_time ? "default" : "outline"}
                        className="h-12"
                        onClick={() => setSelectedTimeSlot(slot)}
                      >
                        {slot.time_display}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Aucun créneau disponible pour cette date.
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold mb-6">Vos informations</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Votre nom et prénom"
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Votre numéro de téléphone"
                />
              </div>
              <div>
                <Label htmlFor="email">Email (optionnel)</Label>
                <Input
                  id="email"
                  type="email"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="votre@email.com"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes particulières (optionnel)</Label>
                <Textarea
                  id="notes"
                  value={clientInfo.notes}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Demandes spéciales, allergies, etc."
                  className="min-h-[100px]"
                />
              </div>
            </div>

            {/* Booking Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Récapitulatif de votre réservation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Services :</span>
                  <span>{selectedServices.map(s => s.name).join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coiffeur :</span>
                  <span>{selectedBarber?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date :</span>
                  <span>{selectedDate && format(selectedDate, 'PPPP', { locale: fr })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Heure :</span>
                  <span>{selectedTimeSlot?.time_display}</span>
                </div>
                <div className="flex justify-between">
                  <span>Durée :</span>
                  <span>{getTotalDuration()} minutes</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total :</span>
                  <span>{getTotalPrice().toFixed(2)}€</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Réservation confirmée !</h2>
            <p className="text-muted-foreground mb-6">
              Votre rendez-vous a été créé avec succès. Vous recevrez une confirmation par SMS.
            </p>
            <Card className="text-left max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Détails de votre rendez-vous</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Date :</span>
                  <span>{selectedDate && format(selectedDate, 'PPPP', { locale: fr })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Heure :</span>
                  <span>{selectedTimeSlot?.time_display}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coiffeur :</span>
                  <span>{selectedBarber?.name}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total :</span>
                  <span>{getTotalPrice().toFixed(2)}€</span>
                </div>
              </CardContent>
            </Card>
            <div className="mt-6 space-y-3">
              <Button asChild className="w-full">
                <Link to="/">
                  Retour à l'accueil
                </Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                Nouvelle réservation
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading && step === 1) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-24 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Progress Steps */}
          {step < 5 && (
            <div className="mb-8">
              <div className="flex justify-between items-center">
                {[1, 2, 3, 4].map((stepNumber) => (
                  <div
                    key={stepNumber}
                    className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium ${
                      step >= stepNumber
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step > stepNumber ? <Check className="w-5 h-5" /> : stepNumber}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Services</span>
                <span>Coiffeur</span>
                <span>Créneau</span>
                <span>Confirmation</span>
              </div>
            </div>
          )}

          {/* Step Content */}
          <Card>
            <CardContent className="p-6">
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          {step < 5 && (
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={step === 1}
              >
                Précédent
              </Button>
              
              {step < 4 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceedToNextStep()}
                >
                  Suivant
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceedToNextStep() || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Confirmation...
                    </>
                  ) : (
                    'Confirmer la réservation'
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Booking;