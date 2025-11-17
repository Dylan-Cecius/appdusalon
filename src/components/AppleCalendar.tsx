import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import AppointmentModal from './AppointmentModal';
import EditAppointmentModal from './EditAppointmentModal';
import { toast } from '@/hooks/use-toast';

type ViewMode = 'month' | 'week' | 'day';

const AppleCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  
  const { appointments, markAsPaid, deleteAppointment } = useSupabaseAppointments();
  const { barbers } = useSupabaseSettings();

  const activeBarbers = barbers.filter(b => b.is_active);

  // Get color based on service category
  const getServiceColor = (services: any[]) => {
    if (!services || services.length === 0) return {
      bg: 'from-primary via-primary to-primary/90',
      text: 'text-primary-foreground'
    };
    
    const mainService = services[0];
    const category = mainService.category || 'general';
    
    const categoryColors: Record<string, { bg: string; text: string }> = {
      'coupe': { 
        bg: 'from-blue-500 via-blue-600 to-blue-700',
        text: 'text-white'
      },
      'barbe': { 
        bg: 'from-orange-500 via-orange-600 to-orange-700',
        text: 'text-white'
      },
      'combo': { 
        bg: 'from-purple-500 via-purple-600 to-purple-700',
        text: 'text-white'
      },
      'produit': { 
        bg: 'from-green-500 via-green-600 to-green-700',
        text: 'text-white'
      },
      'general': { 
        bg: 'from-primary via-primary to-primary/90',
        text: 'text-primary-foreground'
      }
    };
    
    return categoryColors[category] || categoryColors['general'];
  };

  // Set first barber as selected when barbers load
  useEffect(() => {
    if (activeBarbers.length > 0 && !selectedBarberId) {
      setSelectedBarberId(activeBarbers[0].id);
    }
  }, [activeBarbers, selectedBarberId]);

  // Get appointments for a specific date (filtered by selected barber)
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.startTime), date) &&
      (!selectedBarberId || apt.barberId === selectedBarberId)
    );
  };

  // Navigation functions
  const navigatePrev = () => {
    if (viewMode === 'month') {
      setSelectedDate(subMonths(selectedDate, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else {
      setSelectedDate(subDays(selectedDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setSelectedDate(addMonths(selectedDate, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Render Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    return (
      <div className="bg-gradient-to-br from-background via-background to-muted/20 rounded-3xl overflow-hidden border border-border/50 shadow-lg">
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30">
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-semibold text-foreground/70 tracking-wide">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayAppointments = getAppointmentsForDate(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, selectedDate);
            const isSelected = isSameDay(day, selectedDate);

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedDate(day);
                  setViewMode('day');
                }}
                className={cn(
                  "min-h-[110px] p-2.5 border-b border-r border-border/30 cursor-pointer transition-all duration-200 hover:bg-gradient-to-br hover:from-primary/5 hover:to-accent/5 hover:shadow-inner",
                  !isCurrentMonth && "bg-muted/10 text-muted-foreground/60",
                  isToday && "bg-gradient-to-br from-primary/10 to-accent/10 ring-1 ring-primary/20 ring-inset",
                  isSelected && "ring-2 ring-primary/50 ring-inset shadow-sm"
                )}
              >
                <div className={cn(
                  "text-sm font-semibold mb-2 transition-all",
                  isToday && "w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center mx-auto shadow-md ring-2 ring-primary/20"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1.5">
                  {dayAppointments.slice(0, 3).map((apt) => {
                    const colors = getServiceColor(apt.services);
                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          "text-[10px] px-2 py-1 rounded-md font-semibold truncate hover:shadow-sm transition-shadow border border-white/20",
                          colors.text
                        )}
                        style={{
                          background: `linear-gradient(to right, ${colors.bg.replace('from-', '').replace('via-', '').replace('to-', '')})`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointment(apt);
                          setIsEditModalOpen(true);
                        }}
                      >
                        {format(new Date(apt.startTime), 'HH:mm')} - {apt.clientName}
                      </div>
                    );
                  })}
                  {dayAppointments.length > 3 && (
                    <div className="text-[10px] text-muted-foreground font-medium pl-2">
                      +{dayAppointments.length - 3} de plus
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Week View
  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0h-23h

    return (
      <div className="bg-gradient-to-br from-background via-background to-muted/20 rounded-3xl overflow-hidden border border-border/50 shadow-lg">
        {/* Week header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30">
          <div className="p-3"></div>
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toString()} className="p-3 text-center border-l border-border/30">
                <div className={cn(
                  "text-xs text-foreground/60 uppercase tracking-wider font-semibold",
                  isToday && "text-primary font-bold"
                )}>
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div className={cn(
                  "text-2xl font-bold mt-1.5 text-foreground",
                  isToday && "w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center mx-auto shadow-lg ring-2 ring-primary/30"
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Week grid */}
        <div className="overflow-auto max-h-[600px]">
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            {hours.map((hour) => (
              <>
                <div key={`hour-${hour}`} className="p-2 text-sm text-foreground/50 font-medium text-right border-b border-border/30 h-20 bg-muted/5">
                  {hour}:00
                </div>
                {weekDays.map((day) => {
                  const dayAppointments = getAppointmentsForDate(day);

                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="border-l border-b border-border/30 h-20 hover:bg-gradient-to-br hover:from-primary/5 hover:to-accent/5 cursor-pointer relative transition-colors"
                      onClick={() => {
                        setSelectedDate(day);
                        setSelectedTimeSlot(`${hour}:00`);
                        setIsModalOpen(true);
                      }}
                    >
                      {dayAppointments.map((apt) => {
                        const startTime = new Date(apt.startTime);
                        const endTime = new Date(apt.endTime);
                        const aptHour = startTime.getHours();
                        const aptMinutes = startTime.getMinutes();
                        
                        // Only render if this appointment starts in this hour slot
                        if (aptHour !== hour) return null;
                        
                        // Calculate height based on duration (in minutes)
                        const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                        const heightPx = (durationMinutes / 60) * 80; // 80px = 1 hour
                        
                        // Calculate top position based on minutes
                        const topPx = (aptMinutes / 60) * 80;

                        const colors = getServiceColor(apt.services);

                        return (
                          <div
                            key={apt.id}
                            className={cn(
                              "absolute left-1 right-1 text-xs p-2 rounded-xl cursor-pointer shadow-md hover:shadow-lg overflow-hidden transition-shadow border border-white/20",
                              colors.text
                            )}
                            style={{
                              top: `${topPx}px`,
                              height: `${heightPx}px`,
                              minHeight: '20px',
                              backgroundImage: `linear-gradient(135deg, ${colors.bg.split(' ').map((c: string) => {
                                if (c.startsWith('from-')) return `var(--${c.replace('from-', '')})`;
                                if (c.startsWith('via-')) return `var(--${c.replace('via-', '')})`;
                                if (c.startsWith('to-')) return `var(--${c.replace('to-', '')})`;
                                return c;
                              }).join(', ')})`
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(apt);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <div className="font-bold truncate">{apt.clientName}</div>
                            <div className="opacity-90 text-[10px] font-medium">
                              {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render Day View
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0h-23h
    const dayAppointments = getAppointmentsForDate(selectedDate);

    return (
      <div className="bg-gradient-to-br from-background via-background to-muted/20 rounded-3xl overflow-hidden border border-border/50 shadow-lg">
        {/* Day header */}
        <div className="p-8 border-b border-border/50 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30">
          <div className="text-sm text-foreground/60 uppercase tracking-widest font-semibold">
            {format(selectedDate, 'EEEE', { locale: fr })}
          </div>
          <div className="text-5xl font-bold mt-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            {format(selectedDate, 'd MMMM yyyy', { locale: fr })}
          </div>
        </div>

        {/* Day timeline */}
        <div className="overflow-auto max-h-[600px]">
          <div className="grid grid-cols-[90px_1fr]">
            {hours.map((hour) => {
              return (
                <>
                  <div key={`hour-${hour}`} className="p-4 text-sm text-foreground/50 font-medium text-right border-b border-border/30 h-20 bg-muted/5">
                    {hour}:00
                  </div>
                  <div
                    className="border-b border-border/30 h-20 hover:bg-gradient-to-br hover:from-primary/5 hover:to-accent/5 cursor-pointer relative transition-colors"
                    onClick={() => {
                      setSelectedTimeSlot(`${hour}:00`);
                      setIsModalOpen(true);
                    }}
                  >
                    {dayAppointments.map((apt) => {
                      const startTime = new Date(apt.startTime);
                      const endTime = new Date(apt.endTime);
                      const aptHour = startTime.getHours();
                      const aptMinutes = startTime.getMinutes();
                      
                      // Only render if this appointment starts in this hour slot
                      if (aptHour !== hour) return null;
                      
                      // Calculate height based on duration (in minutes)
                      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                      const heightPx = (durationMinutes / 60) * 80; // 80px = 1 hour
                      
                      // Calculate top position based on minutes
                      const topPx = (aptMinutes / 60) * 80;

                      const colors = getServiceColor(apt.services);

                      return (
                        <div
                          key={apt.id}
                          className={cn(
                            "absolute left-3 right-3 p-4 rounded-2xl cursor-pointer shadow-lg hover:shadow-xl transition-all overflow-hidden border border-white/20",
                            colors.text
                          )}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            minHeight: '40px',
                            backgroundImage: `linear-gradient(135deg, ${colors.bg.split(' ').map((c: string) => {
                              if (c.startsWith('from-')) return `var(--${c.replace('from-', '')})`;
                              if (c.startsWith('via-')) return `var(--${c.replace('via-', '')})`;
                              if (c.startsWith('to-')) return `var(--${c.replace('to-', '')})`;
                              return c;
                            }).join(', ')})`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(apt);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold text-lg truncate">{apt.clientName}</div>
                            <div className="text-sm font-semibold bg-white/20 px-2 py-0.5 rounded-full">{apt.totalPrice}€</div>
                          </div>
                          <div className="text-sm opacity-95 font-medium">
                            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                          </div>
                          {heightPx > 60 && (
                            <div className="text-xs opacity-80 mt-2 truncate">
                              {apt.services?.map((s: any) => s.name).join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-background via-background/95 to-muted/30 border border-border/50 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            {/* Left: Title and Navigation */}
            <div className="flex items-center gap-5">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {viewMode === 'month' && format(selectedDate, 'MMMM yyyy', { locale: fr })}
                {viewMode === 'week' && `Semaine du ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM', { locale: fr })}`}
                {viewMode === 'day' && format(selectedDate, 'd MMMM yyyy', { locale: fr })}
              </h1>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={navigatePrev}
                  className="rounded-full hover:bg-primary/10 hover:border-primary/30 transition-all shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  onClick={goToToday}
                  className="rounded-full px-5 font-semibold hover:bg-primary/10 hover:border-primary/30 transition-all shadow-sm"
                >
                  Aujourd'hui
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={navigateNext}
                  className="rounded-full hover:bg-primary/10 hover:border-primary/30 transition-all shadow-sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Right: View mode and Add button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1 shadow-inner border border-border/30">
                <Button
                  variant={viewMode === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('day')}
                  className={cn(
                    "rounded-full font-semibold transition-all",
                    viewMode === 'day' && "shadow-md"
                  )}
                >
                  Jour
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className={cn(
                    "rounded-full font-semibold transition-all",
                    viewMode === 'week' && "shadow-md"
                  )}
                >
                  Semaine
                </Button>
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className={cn(
                    "rounded-full font-semibold transition-all",
                    viewMode === 'month' && "shadow-md"
                  )}
                >
                  Mois
                </Button>
              </div>

              <Button
                onClick={() => {
                  setSelectedTimeSlot('');
                  setIsModalOpen(true);
                }}
                className="rounded-full shadow-lg hover:shadow-xl transition-all font-semibold bg-gradient-to-r from-primary to-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouveau RDV
              </Button>
            </div>
          </div>

          {/* Barber Selection Pills */}
          {activeBarbers.length > 0 && (
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
              {activeBarbers.map((barber) => (
                <Button
                  key={barber.id}
                  variant={selectedBarberId === barber.id ? 'default' : 'outline'}
                  onClick={() => setSelectedBarberId(barber.id)}
                  className={cn(
                    "min-w-fit whitespace-nowrap rounded-full transition-all font-semibold",
                    selectedBarberId === barber.id 
                      ? "shadow-lg bg-gradient-to-r from-primary to-primary/90" 
                      : "hover:bg-muted/60 hover:border-primary/30 shadow-sm"
                  )}
                  size="sm"
                >
                  {barber.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Calendar Content */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}

      {/* Modals */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        barberId={selectedBarberId}
        selectedTimeSlot={selectedTimeSlot}
      />

      {selectedAppointment && (
        <EditAppointmentModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onUpdate={(id, updates) => {
            setIsEditModalOpen(false);
            setSelectedAppointment(null);
          }}
          onDelete={(id) => {
            deleteAppointment(id);
            setIsEditModalOpen(false);
            setSelectedAppointment(null);
            toast({
              title: "Rendez-vous supprimé",
              description: "Le rendez-vous a été supprimé avec succès",
            });
          }}
          onPay={(id, method) => {
            markAsPaid(id);
            setIsEditModalOpen(false);
            setSelectedAppointment(null);
            toast({
              title: "Paiement enregistré",
              description: `Paiement de ${selectedAppointment.totalPrice}€ par ${method}`,
            });
          }}
        />
      )}
    </div>
  );
};

export default AppleCalendar;
