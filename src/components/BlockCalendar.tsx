import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, ChevronLeft, ChevronRight, Settings, CalendarDays, Coffee } from 'lucide-react';
import { format, addDays, subDays, addWeeks, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import AppointmentModal from './AppointmentModal';
import BlockModal, { BlockData } from './BlockModal';
import LunchBreakModal, { LunchBreakData } from './LunchBreakModal';
import EditAppointmentModal from './EditAppointmentModal';
import { toast } from '@/hooks/use-toast';
import { defaultBarbers, Barber, getActiveBarbers } from '@/data/barbers';
import { useSupabaseLunchBreaks } from '@/hooks/useSupabaseLunchBreaks';
import { useSupabaseCustomBlocks } from '@/hooks/useSupabaseCustomBlocks';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';

const BlockCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isLunchBreakModalOpen, setIsLunchBreakModalOpen] = useState(false);
  const [isEditAppointmentModalOpen, setIsEditAppointmentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedBarber, setSelectedBarber] = useState<string>(''); // Will be set when barbers load
  const [selectedCustomBlock, setSelectedCustomBlock] = useState<any>(null);
  const { barbers } = useSupabaseSettings();
  const { appointments, markAsPaid, updateAppointment, deleteAppointment, loading } = useSupabaseAppointments();
  const { 
    lunchBreaks, 
    saveLunchBreak, 
    isLunchBreakTime, 
    loading: lunchBreaksLoading 
  } = useSupabaseLunchBreaks();
  const { 
    customBlocks, 
    addCustomBlock, 
    updateCustomBlock, 
    deleteCustomBlock, 
    getCustomBlocksForSlot, 
    loading: customBlocksLoading 
  } = useSupabaseCustomBlocks();

  const activeBarbers = barbers.filter(b => b.is_active);
  const currentBarber = activeBarbers.find(b => b.id === selectedBarber);

  // Set first barber as selected when barbers load
  useEffect(() => {
    if (barbers.length > 0 && !selectedBarber) {
      setSelectedBarber(barbers[0].id);
    }
  }, [barbers, selectedBarber]);

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

  const handleEditAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsEditAppointmentModalOpen(true);
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

  // Get start of week (Monday) based on selected date
  const getWeekDates = (date: Date) => {
    const dates = [];
    const startOfWeek = new Date(date);
    const dayOfWeek = startOfWeek.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Handle Sunday (0)
    startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);
    
    // Get Tuesday to Saturday (5 days)
    for (let i = 1; i <= 5; i++) {
      const weekDate = new Date(startOfWeek);
      weekDate.setDate(startOfWeek.getDate() + i);
      dates.push(weekDate);
    }
    
    return dates;
  };

  const weekDates = getWeekDates(selectedDate);
  const dayNames = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  // Navigate week instead of day
  const navigateWeek = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'next' ? addWeeks(selectedDate, 1) : subWeeks(selectedDate, 1));
  };

  // Get appointments for a specific date and barber
  const getAppointmentsForDateAndBarber = (date: Date, barberId: string) => {
    return appointments.filter(apt => {
      if (apt.startTime.toDateString() !== date.toDateString()) return false;
      if (apt.barberId !== barberId) return false;
      return true;
    });
  };

  // Get appointments for a specific time slot and barber
  const getAppointmentsForSlot = (date: Date, timeSlot: string, barberId: string) => {
    const [hour, minute] = timeSlot.split(':').map(Number);
    return getAppointmentsForDateAndBarber(date, barberId).filter(apt => {
      const aptHour = apt.startTime.getHours();
      const aptMinute = apt.startTime.getMinutes();
      return aptHour === hour && aptMinute === minute;
    });
  };

  // Check if barber is working on this day
  const isWorkingDay = (barber: any, date: Date) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    return barber.working_days?.includes(dayName) ?? true;
  };

  // Check if barber is working at this time slot
  const isBarberWorking = (barber: any, timeSlot: string, date?: Date) => {
    // First check if barber works on this day
    const checkDate = date || selectedDate;
    if (!isWorkingDay(barber, checkDate)) {
      return false;
    }
    
    const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
    const [startHour, startMinute] = barber.start_time.split(':').map(Number);
    const [endHour, endMinute] = barber.end_time.split(':').map(Number);
    
    const slotTime = slotHour * 60 + slotMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    return slotTime >= startTime && slotTime < endTime;
  };

  // Check if time slot is blocked by lunch break
  const isLunchTime = (barberId: string, timeSlot: string) => {
    return isLunchBreakTime(barberId, timeSlot);
  };

  // Get custom blocks for a specific time slot
  const getCustomBlocksForTimeSlot = (date: Date, timeSlot: string, barberId: string) => {
    return getCustomBlocksForSlot(date, timeSlot, barberId);
  };

  const handleTimeSlotClick = (timeSlot: string) => {
    if (!currentBarber) return;
    
    const isWorking = isBarberWorking(currentBarber, timeSlot);
    const isLunchTimeSlot = isLunchTime(currentBarber.id, timeSlot);
    
    if (!isWorking || isLunchTimeSlot) return;
    
    setSelectedTimeSlot(timeSlot);
    setSelectedCustomBlock(null); // Reset pour nouveau créneau
    setIsBlockModalOpen(true);
  };

  const handleSaveBlock = (blockData: BlockData) => {
    if (selectedCustomBlock) {
      // Mise à jour d'un bloc existant
      updateCustomBlock(selectedCustomBlock.id, blockData);
    } else {
      // Ajout d'un nouveau bloc
      addCustomBlock(blockData, selectedBarber, selectedDate);
    }
  };

  const handleDeleteBlock = () => {
    if (selectedCustomBlock) {
      deleteCustomBlock(selectedCustomBlock.id);
    }
  };

  const handleCustomBlockClick = (block: any) => {
    setSelectedCustomBlock(block);
    setSelectedTimeSlot(block.startTime);
    setIsBlockModalOpen(true);
  };

  const handleSaveLunchBreak = (breakData: LunchBreakData) => {
    saveLunchBreak(breakData);
  };

  const timeSlots = getTimeSlots();

  return (

    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Planning des coiffeurs</h3>
          </div>
          
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau RDV
          </Button>
        </div>

        {/* Barber Selection Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {activeBarbers.map((barber) => (
            <Button
              key={barber.id}
              variant={selectedBarber === barber.id ? 'default' : 'outline'}
              onClick={() => setSelectedBarber(barber.id)}
              className="min-w-fit whitespace-nowrap"
            >
              {barber.name}
              <span className="ml-2 text-xs opacity-75">
                ({barber.start_time}-{barber.end_time})
              </span>
            </Button>
          ))}
          
          {/* Bouton Configuration Temps de midi */}
          {currentBarber && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLunchBreakModalOpen(true)}
              className="ml-4 text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              <Coffee className="h-4 w-4 mr-2" />
              Temps de midi
            </Button>
          )}
        </div>

        {/* Navigation avec sélecteur de semaine */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start text-left font-normal">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Semaine du {format(weekDates[0], 'dd/MM')} au {format(weekDates[4], 'dd/MM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsDatePickerOpen(false);
                    }
                  }}
                  locale={fr}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            {currentBarber && (
              <span className="text-base font-normal text-muted-foreground">
                - Planning de {currentBarber.name}
              </span>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateWeek('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Weekly Calendar */}
      {currentBarber && (
        <Card className="p-4">
          <div className="border-2 border-black rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid gap-0 bg-gray-100" style={{ gridTemplateColumns: '80px repeat(5, 1fr)' }}>
              <div className="text-xs font-medium text-center p-2 bg-gray-300 text-gray-700 border-r-2 border-black">
                Horaires
              </div>
              {weekDates.map((date, index) => {
                const isWorkingThisDay = isWorkingDay(currentBarber, date);
                return (
                  <div key={date.toISOString()} className={cn(
                    "text-sm font-bold text-center p-3 border-r border-gray-300 last:border-r-0",
                    isWorkingThisDay ? "bg-gray-100" : "bg-gray-200"
                  )}>
                    <div className="text-xs text-gray-600 mb-1">
                      {dayNames[index]}
                    </div>
                    <div className={cn(
                      "text-sm font-medium",
                      isWorkingThisDay ? "text-gray-900" : "text-gray-400"
                    )}>
                      {format(date, 'dd/MM')}
                    </div>
                    {!isWorkingThisDay && (
                      <div className="text-xs text-red-500 mt-1">
                        Fermé
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time slots */}
            {timeSlots.map((timeSlot, timeIndex) => {
              return (
                <div key={timeSlot} className={cn(
                  "grid gap-0",
                  timeIndex < timeSlots.length - 1 && "border-b border-gray-300"
                )} style={{ gridTemplateColumns: '80px repeat(5, 1fr)' }}>
                  {/* Time column */}
                  <div className="flex items-center justify-center text-xs font-medium text-gray-600 bg-gray-100 border-r-2 border-gray-300 p-2 min-h-[70px]">
                    {timeSlot}
                  </div>
                  
                  {/* Day columns */}
                  {weekDates.map((date, dayIndex) => {
                    const isWorkingThisDay = isWorkingDay(currentBarber, date);
                    const isWorking = isBarberWorking(currentBarber, timeSlot, date);
                    const isLunchTimeSlot = isLunchTime(currentBarber.id, timeSlot);
                    const slotAppointments = getAppointmentsForSlot(date, timeSlot, currentBarber.id);
                    const customBlocksForSlot = getCustomBlocksForTimeSlot(date, timeSlot, currentBarber.id);
                    
                    return (
                      <div 
                        key={`${date.toISOString()}-${timeSlot}`}
                        className={cn(
                          "p-2 min-h-[70px] flex items-center justify-center cursor-pointer transition-colors border-r border-gray-300 last:border-r-0",
                          isWorking ? (isLunchTimeSlot ? "bg-orange-100 hover:bg-orange-200" : "bg-white hover:bg-gray-50") : "bg-gray-50"
                        )}
                        onClick={() => {
                          if (!isWorking || isLunchTimeSlot) return;
                          setSelectedDate(date);
                          setSelectedTimeSlot(timeSlot);
                          setSelectedCustomBlock(null);
                          setIsBlockModalOpen(true);
                        }}
                      >
                         {!isWorking ? (
                           <div className="text-center">
                             <span className="text-xs text-gray-400">
                               Congé
                             </span>
                           </div>
                        ) : isLunchTimeSlot ? (
                          <div className="text-center">
                            <div className="flex items-center gap-1 text-orange-600">
                              <Coffee className="h-3 w-3" />
                              <span className="text-xs">Pause</span>
                            </div>
                          </div>
                        ) : slotAppointments.length === 0 && customBlocksForSlot.length === 0 ? (
                          <div className="text-center">
                            <span className="text-xs text-green-600 font-medium">Disponible</span>
                          </div>
                        ) : (
                          <div className="w-full space-y-1">
                            {/* Rendez-vous clients */}
                            {slotAppointments.map((appointment) => (
                              <div
                                key={appointment.id}
                                className={cn(
                                  "rounded p-1 text-white cursor-pointer transition-all hover:shadow-lg text-xs",
                                  getServiceColor(appointment.services),
                                  appointment.isPaid && "opacity-60"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(date);
                                  handleEditAppointment(appointment);
                                }}
                              >
                                <div className="font-bold truncate text-xs">
                                  👤 {appointment.clientName}
                                </div>
                                <div className="text-xs opacity-90">
                                  {appointment.totalPrice.toFixed(0)}€
                                </div>
                                {appointment.isPaid && (
                                  <div className="text-xs bg-green-500 px-1 rounded">✓</div>
                                )}
                              </div>
                            ))}
                            
                            {/* Blocs personnalisés */}
                            {customBlocksForSlot.map((block) => (
                              <div
                                key={`block-${block.id}`}
                                className={cn(
                                  "rounded p-1 text-white cursor-pointer transition-all hover:shadow-lg text-xs",
                                  block.type === 'break' ? 'bg-orange-500' :
                                  block.type === 'unavailable' ? 'bg-gray-500' :
                                  block.type === 'rdv-comptable' ? 'bg-purple-500' :
                                  block.type === 'rdv-medecin' ? 'bg-red-500' :
                                  block.type === 'formation' ? 'bg-green-500' :
                                  block.type === 'conge' ? 'bg-yellow-500' :
                                  'bg-blue-500'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(date);
                                  handleCustomBlockClick(block);
                                }}
                              >
                                <div className="font-bold truncate text-xs">
                                  {block.title}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        barberId={selectedBarber}
      />
      
      <BlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        selectedDate={selectedDate}
        selectedTime={selectedTimeSlot}
        barberId={selectedBarber}
        onSave={handleSaveBlock}
        onDelete={selectedCustomBlock ? handleDeleteBlock : undefined}
        existingData={selectedCustomBlock ? {
          type: selectedCustomBlock.type,
          title: selectedCustomBlock.title,
          startTime: selectedCustomBlock.startTime,
          endTime: selectedCustomBlock.endTime,
          notes: selectedCustomBlock.notes,
          barberId: selectedCustomBlock.barberId
        } : undefined}
      />
      
      <EditAppointmentModal
        isOpen={isEditAppointmentModalOpen}
        onClose={() => setIsEditAppointmentModalOpen(false)}
        appointment={selectedAppointment}
        onUpdate={updateAppointment}
        onDelete={deleteAppointment}
        onPay={handlePayAppointment}
      />
      
      {currentBarber && (
        <LunchBreakModal
          isOpen={isLunchBreakModalOpen}
          onClose={() => setIsLunchBreakModalOpen(false)}
          barberId={currentBarber.id}
          barberName={currentBarber.name}
          onSave={handleSaveLunchBreak}
        />
      )}
    </div>
  );
};

export default BlockCalendar;