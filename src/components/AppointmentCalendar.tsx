import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Euro, Plus, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import AppointmentModal from './AppointmentModal';
import { toast } from '@/hooks/use-toast';

interface AppointmentCalendarProps {
  barberId?: string;
}

const AppointmentCalendar = ({ barberId }: AppointmentCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { appointments, markAsPaid, getAppointmentsForDate, loading } = useSupabaseAppointments();
  
  const selectedDateAppointments = getAppointmentsForDate(selectedDate);
  
  const getStatusColor = (status: string, isPaid: boolean) => {
    if (isPaid) return 'bg-muted text-muted-foreground';
    switch (status) {
      case 'scheduled': return 'bg-pos-card/10 text-pos-card';
      case 'completed': return 'bg-pos-success/10 text-pos-success';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const handlePayAppointment = (appointmentId: string, method: 'cash' | 'card') => {
    if (method === 'card') {
      // Deep link vers Belfius Mobile
      const belfiusUrl = 'belfius://';
      window.open(belfiusUrl, '_blank');
      
      // Fallback vers l'app store si l'app n'est pas installée
      setTimeout(() => {
        if (document.hasFocus()) {
          window.open('https://play.google.com/store/apps/details?id=be.belfius.directmobile.android', '_blank');
        }
      }, 1000);
    }
    
    markAsPaid(appointmentId);
    const appointment = appointments.find(apt => apt.id === appointmentId);
    
    toast({
      title: "Paiement encaissé",
      description: `${appointment?.totalPrice.toFixed(2)}€ encaissé par ${method === 'cash' ? 'espèces' : 'Bancontact'}`,
    });
  };

  // Generate time slots for the day (10h-19h) with half-hour intervals
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 10; hour < 19; hour++) {
      slots.push({ hour, minute: 0 }); // :00
      slots.push({ hour, minute: 30 }); // :30
    }
    slots.push({ hour: 19, minute: 0 }); // End at 19:00
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getAppointmentPosition = (appointment: any) => {
    const startHour = appointment.startTime.getHours();
    const startMinute = appointment.startTime.getMinutes();
    const endHour = appointment.endTime.getHours();
    const endMinute = appointment.endTime.getMinutes();
    
    // Position relative à 10h, en créneaux de 30min
    const startSlot = (startHour - 10) * 2 + Math.floor(startMinute / 30);
    const endSlot = (endHour - 10) * 2 + Math.floor(endMinute / 30);
    const duration = endSlot - startSlot;
    
    return { 
      top: startSlot * 40, // 40px par créneau de 30min
      height: Math.max(duration * 40, 60) // Minimum 60px (plus grand)
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="p-4 lg:col-span-1">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          locale={fr}
          className="rounded-md border-0"
          modifiers={{
            hasAppointment: (date) => 
              appointments.some(apt => apt.startTime.toDateString() === date.toDateString())
          }}
          modifiersStyles={{
            hasAppointment: { 
              backgroundColor: 'hsl(var(--accent))', 
              color: 'hsl(var(--accent-foreground))',
              fontWeight: 'bold'
            }
          }}
        />
      </Card>

      {/* Schedule Grid */}
      <Card className="p-6 lg:col-span-2">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-semibold text-primary">
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedDateAppointments.length} rendez-vous
            </p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={!barberId}
            title={!barberId ? "Veuillez d'abord sélectionner un coiffeur dans les paramètres" : ""}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau RDV
          </Button>
        </div>

        {selectedDateAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun rendez-vous ce jour</p>
          </div>
        ) : (
          <div className="relative">
            {/* Time Grid */}
            <div className="grid grid-cols-12 gap-1 mb-4">
              <div className="col-span-2 text-sm font-medium text-muted-foreground">Heure</div>
              <div className="col-span-10 text-sm font-medium text-muted-foreground">Planning</div>
            </div>
            
            <div className="relative border rounded-lg overflow-hidden">
              {/* Time slots */}
              {timeSlots.map((slot, index) => (
                <div key={`${slot.hour}-${slot.minute}`} className={cn(
                  "grid grid-cols-12 border-b border-muted/20 min-h-[40px]",
                  slot.minute === 0 ? "border-b-2" : "border-b border-dashed"
                )}>
                  <div className="col-span-2 p-2 bg-muted/5 border-r border-muted/20">
                    <div className="text-sm font-medium">
                      {slot.hour.toString().padStart(2, '0')}:{slot.minute.toString().padStart(2, '0')}
                    </div>
                  </div>
                  <div className="col-span-10 relative">
                    {/* This will contain the appointments */}
                  </div>
                </div>
              ))}
              
              {/* Appointments overlay */}
              <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                <div className="grid grid-cols-12 h-full">
                  <div className="col-span-2"></div>
                  <div className="col-span-10 relative">
                    {selectedDateAppointments.map((appointment) => {
                      const position = getAppointmentPosition(appointment);
                      return (
                        <div
                          key={appointment.id}
                          className={cn(
                            "absolute rounded p-1 pointer-events-auto cursor-pointer transition-all duration-200 text-xs border",
                            appointment.isPaid 
                              ? "bg-muted/50 text-muted-foreground border-muted/40" 
                              : "bg-accent text-accent-foreground border-accent shadow-sm"
                          )}
                          style={{
                            top: `${position.top + 2}px`,
                            left: '2px',
                            right: '2px',
                            height: `${position.height - 4}px`,
                            minHeight: '36px'
                          }}
                        >
                          <div className="h-full overflow-hidden p-1">
                            {/* Ligne 1: Nom + Service + Badge */}
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <User className="h-3 w-3 flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="font-medium text-sm truncate block">
                                    {appointment.clientName}
                                  </span>
                                  <span className="text-xs opacity-75 truncate block">
                                    ({appointment.services[0]?.name})
                                  </span>
                                </div>
                              </div>
                              <Badge 
                                className="text-xs px-2 py-1 flex-shrink-0 ml-2"
                                variant={appointment.isPaid ? "secondary" : "default"}
                              >
                                RDV
                              </Badge>
                            </div>
                            
                            {/* Ligne 2: Horaire */}
                            <div className="text-sm font-medium mb-2">
                              {format(appointment.startTime, 'HH:mm')} - {format(appointment.endTime, 'HH:mm')}
                            </div>
                            
                            {/* Ligne 3: Prix + Boutons */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <Euro className="h-3 w-3" />
                                <span className="text-sm font-medium">
                                  {appointment.totalPrice.toFixed(2)}€
                                </span>
                              </div>
                              
                              {!appointment.isPaid && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handlePayAppointment(appointment.id, 'cash')}
                                    className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    Cash
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handlePayAppointment(appointment.id, 'card')}
                                    className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    BC
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        barberId={barberId}
      />
    </div>
  );
};

export default AppointmentCalendar;