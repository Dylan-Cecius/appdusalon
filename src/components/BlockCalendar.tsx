import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import AppointmentModal from './AppointmentModal';
import { toast } from '@/hooks/use-toast';

const BlockCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const { appointments, markAsPaid, loading } = useSupabaseAppointments();

  // Colors for different service categories
  const getServiceColor = (services: any[]) => {
    if (!services || services.length === 0) return 'bg-purple-500';
    const category = services[0]?.category;
    switch (category) {
      case 'coupe': return 'bg-red-500';
      case 'barbe': return 'bg-pink-500';
      case 'combo': return 'bg-purple-600';
      case 'produit': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const handlePayAppointment = (appointmentId: string, method: 'cash' | 'card') => {
    if (method === 'card') {
      // Deep link vers Belfius Mobile
      const belfiusUrl = 'belfius://';
      window.open(belfiusUrl, '_blank');
      
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

  // Get week days starting from Monday
  const getWeekDays = (baseDate: Date) => {
    const start = startOfWeek(baseDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      apt.startTime.toDateString() === date.toDateString()
    );
  };

  // Get time slots for the day (8 slots: 9h-17h)
  const getTimeSlots = () => {
    return Array.from({ length: 8 }, (_, i) => 9 + i);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'next' ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1));
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
  };

  const weekDays = getWeekDays(selectedDate);
  const timeSlots = getTimeSlots();

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Semaine
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Jour
            </Button>
          </div>
          
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter RDV
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => viewMode === 'week' ? navigateWeek('prev') : navigateDay('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold">
            {viewMode === 'week' 
              ? `${format(weekDays[0], 'd MMM', { locale: fr })} - ${format(weekDays[6], 'd MMM yyyy', { locale: fr })}`
              : format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })
            }
          </h2>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => viewMode === 'week' ? navigateWeek('next') : navigateDay('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card className="p-4">
        {viewMode === 'week' ? (
          <div className="space-y-2">
            {/* Days header */}
            <div className="grid grid-cols-8 gap-2 mb-4">
              <div className="text-xs font-medium text-muted-foreground p-2"></div>
              {weekDays.map((day) => (
                <div key={day.toString()} className="text-center">
                  <div className="text-xs font-medium text-muted-foreground">
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className="text-sm font-semibold">
                    {format(day, 'd')}
                  </div>
                </div>
              ))}
            </div>

            {/* Time slots and appointments */}
            {timeSlots.map((hour) => (
              <div key={hour} className="grid grid-cols-8 gap-2 min-h-[60px]">
                <div className="flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted/30 rounded">
                  {hour}h
                </div>
                {weekDays.map((day) => {
                  const dayAppointments = getAppointmentsForDate(day).filter(apt => 
                    apt.startTime.getHours() >= hour && apt.startTime.getHours() < hour + 1
                  );
                  
                  return (
                    <div key={`${day.toString()}-${hour}`} className="space-y-1">
                      {dayAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className={cn(
                            "rounded-lg p-2 text-white text-xs cursor-pointer transition-all hover:shadow-md",
                            getServiceColor(appointment.services),
                            appointment.isPaid && "opacity-50"
                          )}
                          onClick={() => {
                            if (!appointment.isPaid) {
                              handlePayAppointment(appointment.id, 'cash');
                            }
                          }}
                        >
                          <div className="font-medium truncate">
                            {appointment.clientName}
                          </div>
                          <div className="text-xs opacity-90 truncate">
                            {appointment.services[0]?.name}
                          </div>
                          <div className="text-xs opacity-90">
                            {format(appointment.startTime, 'HH:mm')}
                          </div>
                          <div className="text-xs font-medium">
                            {appointment.totalPrice.toFixed(2)}€
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          /* Day View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {timeSlots.map((hour) => {
              const hourAppointments = getAppointmentsForDate(selectedDate).filter(apt => 
                apt.startTime.getHours() >= hour && apt.startTime.getHours() < hour + 1
              );
              
              return (
                <div key={hour} className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground text-center p-2 bg-muted/30 rounded">
                    {hour}h00 - {hour + 1}h00
                  </div>
                  {hourAppointments.length === 0 ? (
                    <div className="h-20 border-2 border-dashed border-muted/30 rounded-lg flex items-center justify-center text-muted-foreground text-xs">
                      Libre
                    </div>
                  ) : (
                    hourAppointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className={cn(
                          "rounded-lg p-3 text-white cursor-pointer transition-all hover:shadow-lg min-h-[80px]",
                          getServiceColor(appointment.services),
                          appointment.isPaid && "opacity-50"
                        )}
                        onClick={() => {
                          if (!appointment.isPaid) {
                            handlePayAppointment(appointment.id, 'cash');
                          }
                        }}
                      >
                        <div className="font-medium text-sm truncate mb-1">
                          {appointment.clientName}
                        </div>
                        <div className="text-xs opacity-90 truncate mb-1">
                          {appointment.services[0]?.name}
                        </div>
                        <div className="text-xs opacity-90 mb-1">
                          {format(appointment.startTime, 'HH:mm')} - {format(appointment.endTime, 'HH:mm')}
                        </div>
                        <div className="text-sm font-bold">
                          {appointment.totalPrice.toFixed(2)}€
                        </div>
                        {appointment.isPaid && (
                          <div className="text-xs opacity-75 mt-1">
                            ✓ Payé
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
      />
    </div>
  );
};

export default BlockCalendar;