import { useState } from 'react';
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

const BlockCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isLunchBreakModalOpen, setIsLunchBreakModalOpen] = useState(false);
  const [isEditAppointmentModalOpen, setIsEditAppointmentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [barbers, setBarbers] = useState<Barber[]>(defaultBarbers);
  const [selectedBarber, setSelectedBarber] = useState<string>('1'); // Sélectionner le premier coiffeur par défaut
  const [lunchBreaks, setLunchBreaks] = useState<LunchBreakData[]>([]);
  const [customBlocks, setCustomBlocks] = useState<BlockData[]>([]);
  const { appointments, markAsPaid, updateAppointment, deleteAppointment, loading } = useSupabaseAppointments();

  const activeBarbers = getActiveBarbers(barbers);
  const currentBarber = activeBarbers.find(b => b.id === selectedBarber);

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

  const navigateDay = (direction: 'prev' | 'next') => {
    setSelectedDate(direction === 'next' ? addDays(selectedDate, 1) : subDays(selectedDate, 1));
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

  // Check if time slot is blocked by lunch break
  const isLunchBreakTime = (barberId: string, timeSlot: string) => {
    const lunchBreak = lunchBreaks.find(lb => lb.barberId === barberId && lb.isActive);
    if (!lunchBreak) return false;
    
    const [slotHour, slotMinute] = timeSlot.split(':').map(Number);
    const [startHour, startMinute] = lunchBreak.startTime.split(':').map(Number);
    const [endHour, endMinute] = lunchBreak.endTime.split(':').map(Number);
    
    const slotTime = slotHour * 60 + slotMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    return slotTime >= startTime && slotTime < endTime;
  };

  // Get custom blocks for a specific time slot
  const getCustomBlocksForSlot = (date: Date, timeSlot: string, barberId: string) => {
    return customBlocks.filter(block => {
      if (block.barberId !== barberId) return false;
      if (block.startTime !== timeSlot) return false;
      // TODO: Check date when we add date-specific blocks
      return true;
    });
  };

  const handleTimeSlotClick = (timeSlot: string) => {
    if (!currentBarber) return;
    
    const isWorking = isBarberWorking(currentBarber, timeSlot);
    const isLunchTime = isLunchBreakTime(currentBarber.id, timeSlot);
    
    if (!isWorking || isLunchTime) return;
    
    setSelectedTimeSlot(timeSlot);
    setIsBlockModalOpen(true);
  };

  const handleSaveBlock = (blockData: BlockData) => {
    setCustomBlocks(prev => [...prev, { ...blockData, barberId: selectedBarber }]);
    toast({
      title: "Créneau ajouté",
      description: `${blockData.title} ajouté à ${blockData.startTime}`,
    });
  };

  const handleSaveLunchBreak = (breakData: LunchBreakData) => {
    setLunchBreaks(prev => {
      const filtered = prev.filter(lb => lb.barberId !== breakData.barberId);
      return [...filtered, breakData];
    });
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
                ({barber.startTime}-{barber.endTime})
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

        {/* Navigation avec sélecteur de date */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigateDay('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3">
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start text-left font-normal">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
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
            onClick={() => navigateDay('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Individual Barber Calendar */}
      {currentBarber && (
        <Card className="p-4">
          <div className="border-2 border-black rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid gap-0 bg-gray-100" style={{ gridTemplateColumns: '80px 1fr' }}>
              <div className="text-xs font-medium text-center p-2 bg-gray-300 text-gray-700 border-r-2 border-black">
                Horaires
              </div>
              <div className="text-sm font-bold text-center p-3 bg-gray-100">
                <div className={cn("inline-block px-3 py-1 rounded", currentBarber.color)}>
                  <span className="text-white">{currentBarber.name}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {currentBarber.startTime} - {currentBarber.endTime}
                </div>
              </div>
            </div>

            {/* Time slots */}
            {timeSlots.map((timeSlot, index) => {
              const isWorking = isBarberWorking(currentBarber, timeSlot);
              const isLunchTime = isLunchBreakTime(currentBarber.id, timeSlot);
              const slotAppointments = getAppointmentsForSlot(selectedDate, timeSlot, currentBarber.id);
              const customBlocksForSlot = getCustomBlocksForSlot(selectedDate, timeSlot, currentBarber.id);
              
              return (
                <div key={timeSlot} className={cn(
                  "grid gap-0",
                  index < timeSlots.length - 1 && "border-b border-gray-300"
                )} style={{ gridTemplateColumns: '80px 1fr' }}>
                  {/* Time column - plus petite et couleur douce */}
                  <div className="flex items-center justify-center text-xs font-medium text-gray-600 bg-gray-100 border-r-2 border-gray-300 p-2 min-h-[70px]">
                    {timeSlot}
                  </div>
                  
                  {/* Appointment column */}
                  <div 
                    className={cn(
                      "p-3 min-h-[70px] flex items-center justify-center cursor-pointer transition-colors",
                      isWorking ? (isLunchTime ? "bg-orange-100 hover:bg-orange-200" : "bg-white hover:bg-gray-50") : "bg-gray-50"
                    )}
                    onClick={() => handleTimeSlotClick(timeSlot)}
                  >
                    {!isWorking ? (
                      <div className="text-center">
                        <span className="text-sm text-gray-400">🔒 Fermé</span>
                      </div>
                    ) : isLunchTime ? (
                      <div className="text-center">
                        <div className="flex items-center gap-2 text-orange-600">
                          <Coffee className="h-4 w-4" />
                          <span className="text-sm font-medium">Pause déjeuner</span>
                        </div>
                      </div>
                    ) : slotAppointments.length === 0 && customBlocksForSlot.length === 0 ? (
                      <div className="text-center">
                        <span className="text-sm text-green-600 font-medium">✓ Disponible - Cliquer pour ajouter</span>
                      </div>
                    ) : (
                      <div className="w-full space-y-2">
                        {/* Rendez-vous clients */}
                        {slotAppointments.map((appointment) => (
                          <div
                            key={appointment.id}
                            className={cn(
                              "rounded-lg p-3 text-white cursor-pointer transition-all hover:shadow-lg border border-gray-400",
                              getServiceColor(appointment.services),
                              appointment.isPaid && "opacity-60"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAppointment(appointment);
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-bold truncate">
                                👤 {appointment.clientName}
                              </div>
                              {appointment.isPaid && (
                                <span className="text-xs bg-green-500 px-2 py-1 rounded">✓ Payé</span>
                              )}
                            </div>
                            
                            <div className="text-sm opacity-90 mb-1">
                              ✂️ {appointment.services[0]?.name}
                            </div>
                            
                            <div className="text-sm opacity-90 mb-2">
                              ⏰ {format(appointment.startTime, 'HH:mm')} - {format(appointment.endTime, 'HH:mm')}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-bold">
                                💰 {appointment.totalPrice.toFixed(2)}€
                              </div>
                              
                              <div className="text-xs bg-black bg-opacity-20 px-2 py-1 rounded">
                                Cliquer pour éditer
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Blocs personnalisés (non disponible, rdv médecin, etc.) */}
                        {customBlocksForSlot.map((block) => (
                          <div
                            key={`block-${block.startTime}`}
                            className={cn(
                              "rounded-lg p-3 text-white cursor-pointer transition-all hover:shadow-lg border border-gray-400",
                              block.type === 'break' ? 'bg-orange-500' :
                              block.type === 'unavailable' ? 'bg-gray-500' :
                              block.type === 'rdv-comptable' ? 'bg-purple-500' :
                              block.type === 'rdv-medecin' ? 'bg-red-500' :
                              block.type === 'formation' ? 'bg-green-500' :
                              block.type === 'conge' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-bold truncate">
                                📅 {block.title}
                              </div>
                            </div>
                            
                            <div className="text-sm opacity-90 mb-2">
                              ⏰ {block.startTime} - {block.endTime}
                            </div>
                            
                            {block.notes && (
                              <div className="text-sm opacity-75">
                                📝 {block.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
      />
      
      <BlockModal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        selectedDate={selectedDate}
        selectedTime={selectedTimeSlot}
        barberId={selectedBarber}
        onSave={handleSaveBlock}
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