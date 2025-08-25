import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { format, addDays, subDays, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import AppointmentModal from './AppointmentModal';
import { toast } from '@/hooks/use-toast';
import { defaultBarbers, Barber, getActiveBarbers } from '@/data/barbers';

const BlockCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [barbers, setBarbers] = useState<Barber[]>(defaultBarbers);
  const [selectedBarber, setSelectedBarber] = useState<string>('all');
  const { appointments, markAsPaid, loading } = useSupabaseAppointments();

  const activeBarbers = getActiveBarbers(barbers);

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

  // Get time slots for the day (10h-19h) with 30-minute intervals
  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 10; hour < 19; hour++) {
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    slots.push('19:00'); // Fermeture
    return slots;
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
  };

  // Get appointments for a specific date and barber
  const getAppointmentsForDateAndBarber = (date: Date, barberId?: string) => {
    return appointments.filter(apt => {
      if (apt.startTime.toDateString() !== date.toDateString()) return false;
      if (barberId && barberId !== 'all' && apt.barberId !== barberId) return false;
      return true;
    });
  };

  // Get appointments for a specific time slot and barber
  const getAppointmentsForSlot = (date: Date, timeSlot: string, barberId?: string) => {
    const [hour, minute] = timeSlot.split(':').map(Number);
    return getAppointmentsForDateAndBarber(date, barberId).filter(apt => {
      const aptHour = apt.startTime.getHours();
      const aptMinute = apt.startTime.getMinutes();
      return aptHour === hour && aptMinute === minute;
    });
  };

  // Check if barber is working at this time slot
  const isBarberWorking = (barber: Barber, timeSlot: string) => {
    const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
    const [startHour, startMinute] = barber.startTime.split(':').map(Number);
    const [endHour, endMinute] = barber.endTime.split(':').map(Number);
    
    const slotTime = slotHour * 60 + slotMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    return slotTime >= startTime && slotTime < endTime;
  };

  const timeSlots = getTimeSlots();

  return (

    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Select value={selectedBarber} onValueChange={setSelectedBarber}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Coiffeur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les coiffeurs</SelectItem>
                {activeBarbers.map((barber) => (
                  <SelectItem key={barber.id} value={barber.id}>
                    {barber.name} ({barber.startTime}-{barber.endTime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Gérer les coiffeurs
            </Button>
          </div>
          
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau RDV
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateDay('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold">
            {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
          </h2>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateDay('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card className="p-4">
        <div className="border-2 border-black rounded-lg overflow-hidden">
          {/* Header with barber names */}
          <div className="grid grid-cols-4 gap-0 mb-0 bg-gray-100">
            <div className="text-sm font-bold text-center p-3 bg-black text-white border-r-2 border-black">
              Horaires
            </div>
            {selectedBarber === 'all' 
              ? activeBarbers.slice(0, 3).map((barber, index) => (
                  <div key={barber.id} className={cn(
                    "text-sm font-bold text-center p-3 bg-gray-100",
                    index < 2 && "border-r-2 border-black"
                  )}>
                    <div>{barber.name}</div>
                    <div className="text-xs text-gray-600">{barber.startTime}-{barber.endTime}</div>
                  </div>
                ))
              : (
                  <div className="text-sm font-bold text-center p-3 bg-gray-100 col-span-3">
                    {activeBarbers.find(b => b.id === selectedBarber)?.name || 'Tous les coiffeurs'}
                  </div>
                )
            }
          </div>

          {/* Time slots */}
          {timeSlots.map((timeSlot, index) => (
            <div key={timeSlot} className={cn(
              selectedBarber === 'all' ? "grid grid-cols-4 gap-0" : "grid grid-cols-2 gap-0",
              index < timeSlots.length - 1 && "border-b border-black"
            )}>
              {/* Time column */}
              <div className="flex items-center justify-center text-sm font-medium text-white bg-black border-r-2 border-black p-3 min-h-[60px]">
                {timeSlot}
              </div>
              
              {/* Appointment columns */}
              {selectedBarber === 'all' 
                ? activeBarbers.slice(0, 3).map((barber, barberIndex) => {
                    const slotAppointments = getAppointmentsForSlot(selectedDate, timeSlot, barber.id);
                    const isWorking = isBarberWorking(barber, timeSlot);
                    
                    return (
                      <div key={barber.id} className={cn(
                        "p-1 min-h-[60px] flex items-center justify-center",
                        barberIndex < 2 && "border-r-2 border-black",
                        isWorking ? "bg-white" : "bg-gray-200"
                      )}>
                        {!isWorking ? (
                          <span className="text-xs text-gray-500">Fermé</span>
                        ) : slotAppointments.length === 0 ? (
                          <span className="text-xs text-gray-400">Libre</span>
                        ) : (
                          <div className="w-full space-y-1">
                            {slotAppointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className={cn(
                                  "rounded p-2 text-white text-xs cursor-pointer transition-all hover:shadow-md border border-black",
                                  getServiceColor(appointment.services),
                                  appointment.isPaid && "opacity-50"
                                )}
                                onClick={() => !appointment.isPaid && handlePayAppointment(appointment.id, 'cash')}
                              >
                                <div className="font-medium truncate">{appointment.clientName}</div>
                                <div className="text-xs opacity-90 truncate">{appointment.services[0]?.name}</div>
                                <div className="text-xs font-medium">{appointment.totalPrice.toFixed(2)}€</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                : (
                    <div className="p-1 min-h-[60px] bg-white col-span-3">
                      {(() => {
                        const barber = activeBarbers.find(b => b.id === selectedBarber);
                        if (!barber || !isBarberWorking(barber, timeSlot)) {
                          return <span className="text-xs text-gray-500 flex items-center justify-center h-full">Fermé</span>;
                        }
                        const slotAppointments = getAppointmentsForSlot(selectedDate, timeSlot, selectedBarber);
                        return slotAppointments.length === 0 ? (
                          <span className="text-xs text-gray-400 flex items-center justify-center h-full">Libre</span>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                            {slotAppointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className={cn(
                                  "rounded p-2 text-white text-xs cursor-pointer transition-all hover:shadow-md border border-black",
                                  getServiceColor(appointment.services),
                                  appointment.isPaid && "opacity-50"
                                )}
                                onClick={() => !appointment.isPaid && handlePayAppointment(appointment.id, 'cash')}
                              >
                                <div className="font-medium truncate">{appointment.clientName}</div>
                                <div className="text-xs opacity-90 truncate">{appointment.services[0]?.name}</div>
                                <div className="text-xs font-medium">{appointment.totalPrice.toFixed(2)}€</div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                      }
                    </div>
                  )
              }
            </div>
          ))}
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

export default BlockCalendar;