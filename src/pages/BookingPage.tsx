import { useState, useEffect } from 'react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, User, ArrowLeft, Loader2, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import { toast } from 'sonner';

const SALON_ID = '6658d645-23c8-415b-ac09-86684c3df509';

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  color: string | null;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  color: string;
}

interface TimeSlot {
  time: string;
  start_time: string;
  end_time: string;
  available: boolean;
}

const STEP_LABELS = ['Prestation', 'Personnel', 'Date & Heure', 'Coordonnées'];

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [salonName, setSalonName] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [noPreference, setNoPreference] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  // Fetch salon data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL || 'https://vrawwiqeutbqqdzkhrax.supabase.co'}/functions/v1/get-salon-booking-data?salon_id=${SALON_ID}`;
        const response = await fetch(url, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYXd3aXFldXRicXFkemtocmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjA0MDEsImV4cCI6MjA3MTczNjQwMX0.TnKumTl96ixa3D5hX0caknjh4DlwPU24PG9m-4hBJjY',
          }
        });
        const data = await response.json();
        setServices(data.services || []);
        setStaff(data.staff || []);
        setSalonName(data.salon?.name || 'Notre Salon');
      } catch (error) {
        console.error('Error fetching booking data:', error);
        toast.error('Impossible de charger les données du salon');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const staffParam = noPreference ? '' : `&staff_id=${selectedStaff?.id || ''}`;
        const url = `${import.meta.env.VITE_SUPABASE_URL || 'https://vrawwiqeutbqqdzkhrax.supabase.co'}/functions/v1/get-booking-slots?salon_id=${SALON_ID}&date=${dateStr}&duration=${selectedService.duration}${staffParam}`;
        const response = await fetch(url, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYXd3aXFldXRicXFkemtocmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjA0MDEsImV4cCI6MjA3MTczNjQwMX0.TnKumTl96ixa3D5hX0caknjh4DlwPU24PG9m-4hBJjY',
          }
        });
        const data = await response.json();
        setSlots(data.slots || []);
      } catch (error) {
        console.error('Error fetching slots:', error);
        toast.error('Impossible de charger les créneaux');
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDate, selectedService, selectedStaff, noPreference]);

  const handleSubmit = async () => {
    if (!selectedService || !selectedSlot || !firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSubmitting(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL || 'https://vrawwiqeutbqqdzkhrax.supabase.co'}/functions/v1/create-public-booking`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYXd3aXFldXRicXFkemtocmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjA0MDEsImV4cCI6MjA3MTczNjQwMX0.TnKumTl96ixa3D5hX0caknjh4DlwPU24PG9m-4hBJjY',
        },
        body: JSON.stringify({
          salon_id: SALON_ID,
          staff_id: noPreference ? null : selectedStaff?.id,
          service: { name: selectedService.name, price: selectedService.price },
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          client_name: `${firstName.trim()} ${lastName.trim()}`,
          client_phone: phone.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la réservation');
      }
      setConfirmed(true);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Réservation confirmée !</h2>
            <p className="text-muted-foreground">
              Votre rendez-vous est confirmé ! À bientôt au salon.
            </p>
            <div className="bg-muted rounded-lg p-4 text-left space-y-1 text-sm">
              <p><strong>Prestation :</strong> {selectedService?.name}</p>
              {selectedStaff && !noPreference && (
                <p><strong>Avec :</strong> {selectedStaff.name}</p>
              )}
              <p><strong>Date :</strong> {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}</p>
              <p><strong>Heure :</strong> {selectedSlot?.time}</p>
              <p><strong>Prix :</strong> {selectedService?.price.toFixed(2)} €</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
              Nouvelle réservation
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Scissors className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">{salonName}</h1>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Réservez votre rendez-vous en ligne</p>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              {STEP_LABELS.map((label, i) => (
                <span key={i} className={i + 1 <= step ? 'text-primary font-medium' : ''}>
                  {i + 1}. {label}
                </span>
              ))}
            </div>
            <Progress value={(step / 4) * 100} className="h-2" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {step > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep(step - 1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour
          </Button>
        )}

        {/* STEP 1: Choose service */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Choisissez une prestation</h2>
            <div className="grid gap-3">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedService?.id === service.id
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedService(service);
                    setStep(2);
                  }}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {service.color && (
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: service.color }}
                        />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{service.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" /> {service.duration} min
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-foreground">{service.price.toFixed(2)} €</span>
                  </CardContent>
                </Card>
              ))}
              {services.length === 0 && (
                <p className="text-muted-foreground text-center py-8">Aucune prestation disponible</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Choose staff */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Choisissez un membre du personnel</h2>
            <div className="grid gap-3">
              {/* No preference option */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  noPreference ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  setNoPreference(true);
                  setSelectedStaff(null);
                  setStep(3);
                }}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Pas de préférence</p>
                    <p className="text-sm text-muted-foreground">Premier disponible</p>
                  </div>
                </CardContent>
              </Card>

              {staff.map((member) => (
                <Card
                  key={member.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedStaff?.id === member.id && !noPreference
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedStaff(member);
                    setNoPreference(false);
                    setStep(3);
                  }}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Date & Time */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Choisissez une date et un créneau</h2>

            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                locale={fr}
                className="rounded-md border pointer-events-auto"
              />
            </div>

            {selectedDate && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Créneaux pour le {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
                </h3>
                {slotsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedSlot?.time === slot.time ? 'default' : 'outline'}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => {
                          setSelectedSlot(slot);
                        }}
                        className={!slot.available ? 'opacity-40 line-through' : ''}
                      >
                        {slot.time}
                      </Button>
                    ))}
                    {slots.length === 0 && (
                      <p className="col-span-full text-center text-muted-foreground py-4">
                        Aucun créneau disponible ce jour
                      </p>
                    )}
                  </div>
                )}

                {selectedSlot && (
                  <Button onClick={() => setStep(4)} className="w-full mt-4">
                    Continuer
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Client info */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Vos coordonnées</h2>

            {/* Recap */}
            <Card>
              <CardContent className="p-4 space-y-1 text-sm">
                <p><strong>Prestation :</strong> {selectedService?.name} — {selectedService?.price.toFixed(2)} €</p>
                {selectedStaff && !noPreference && (
                  <p><strong>Avec :</strong> {selectedStaff.name}</p>
                )}
                <p><strong>Date :</strong> {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}</p>
                <p><strong>Heure :</strong> {selectedSlot?.time}</p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jean"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Dupont"
                    maxLength={50}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  maxLength={20}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting || !firstName.trim() || !lastName.trim() || !phone.trim()}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Réservation en cours...</>
                ) : (
                  'Confirmer ma réservation'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
