import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Euro, Plus, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAppointments } from '@/hooks/useAppointments';
import AppointmentModal from './AppointmentModal';
import { toast } from '@/hooks/use-toast';

const AppointmentCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { appointments, getAppointmentsForDate, markAsPaid } = useAppointments();
  
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

      {/* Appointments List */}
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
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau RDV
          </Button>
        </div>

        <div className="space-y-4">
          {selectedDateAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun rendez-vous ce jour</p>
            </div>
          ) : (
            selectedDateAppointments.map((appointment) => (
              <Card 
                key={appointment.id} 
                className={cn(
                  "p-4 transition-all duration-200",
                  appointment.isPaid ? "opacity-60 bg-muted/20" : "hover:shadow-md"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{appointment.clientName}</span>
                      </div>
                      <Badge className={getStatusColor(appointment.status, appointment.isPaid)}>
                        {appointment.isPaid ? 'Payé' : 'En attente'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(appointment.startTime, 'HH:mm')} - {format(appointment.endTime, 'HH:mm')}
                      </div>
                      <div>{appointment.clientPhone}</div>
                      <div className="flex items-center gap-1">
                        <Euro className="h-3 w-3" />
                        {appointment.totalPrice.toFixed(2)}€
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {appointment.services.map((service) => (
                        <Badge key={service.id} variant="outline" className="text-xs">
                          {service.name} ({service.duration}min)
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {!appointment.isPaid && (
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        onClick={() => handlePayAppointment(appointment.id, 'cash')}
                        className="bg-pos-success hover:bg-pos-success/90 text-pos-success-foreground"
                      >
                        Cash
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePayAppointment(appointment.id, 'card')}
                        className="bg-pos-card hover:bg-pos-card/90 text-white"
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        Bancontact
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default AppointmentCalendar;