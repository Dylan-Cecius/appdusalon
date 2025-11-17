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
  
  const { appointments, markAsPaid, deleteAppointment } = useSupabaseAppointments();
  const { barbers } = useSupabaseSettings();

  const activeBarbers = barbers.filter(b => b.is_active);

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.startTime), date)
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
      <div className="bg-background rounded-2xl overflow-hidden border">
        {/* Week days header */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map((day) => (
            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
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
                  "min-h-[100px] p-2 border-b border-r cursor-pointer transition-colors hover:bg-muted/50",
                  !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                  isToday && "bg-primary/5",
                  isSelected && "ring-2 ring-primary ring-inset"
                )}
              >
                <div className={cn(
                  "text-sm font-medium mb-1",
                  isToday && "w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((apt) => (
                    <div
                      key={apt.id}
                      className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(apt);
                        setIsEditModalOpen(true);
                      }}
                    >
                      {format(new Date(apt.startTime), 'HH:mm')} - {apt.clientName}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-muted-foreground">
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
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8h-20h

    return (
      <div className="bg-background rounded-2xl overflow-hidden border">
        {/* Week header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/30">
          <div className="p-3"></div>
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toString()} className="p-3 text-center border-l">
                <div className={cn(
                  "text-xs text-muted-foreground uppercase tracking-wide",
                  isToday && "text-primary font-semibold"
                )}>
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div className={cn(
                  "text-2xl font-semibold mt-1",
                  isToday && "w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto"
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
                <div key={`hour-${hour}`} className="p-2 text-sm text-muted-foreground text-right border-b">
                  {hour}:00
                </div>
                {weekDays.map((day) => {
                  const dayAppointments = getAppointmentsForDate(day).filter(apt => {
                    const aptHour = new Date(apt.startTime).getHours();
                    return aptHour === hour;
                  });

                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="border-l border-b min-h-[60px] p-1 hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        setSelectedDate(day);
                        setSelectedTimeSlot(`${hour}:00`);
                        setIsModalOpen(true);
                      }}
                    >
                      {dayAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="text-xs p-2 mb-1 rounded-lg bg-primary text-primary-foreground cursor-pointer shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(apt);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <div className="font-semibold">{apt.clientName}</div>
                          <div className="opacity-90">
                            {format(new Date(apt.startTime), 'HH:mm')} - {format(new Date(apt.endTime), 'HH:mm')}
                          </div>
                        </div>
                      ))}
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
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8h-20h
    const dayAppointments = getAppointmentsForDate(selectedDate);

    return (
      <div className="bg-background rounded-2xl overflow-hidden border">
        {/* Day header */}
        <div className="p-6 border-b bg-muted/30">
          <div className="text-sm text-muted-foreground uppercase tracking-wide">
            {format(selectedDate, 'EEEE', { locale: fr })}
          </div>
          <div className="text-4xl font-bold mt-1">
            {format(selectedDate, 'd MMMM yyyy', { locale: fr })}
          </div>
        </div>

        {/* Day timeline */}
        <div className="overflow-auto max-h-[600px]">
          <div className="grid grid-cols-[80px_1fr]">
            {hours.map((hour) => {
              const hourAppointments = dayAppointments.filter(apt => {
                const aptHour = new Date(apt.startTime).getHours();
                return aptHour === hour;
              });

              return (
                <>
                  <div key={`hour-${hour}`} className="p-4 text-sm text-muted-foreground text-right border-b">
                    {hour}:00
                  </div>
                  <div
                    className="border-b min-h-[80px] p-2 hover:bg-muted/30 cursor-pointer"
                    onClick={() => {
                      setSelectedTimeSlot(`${hour}:00`);
                      setIsModalOpen(true);
                    }}
                  >
                    {hourAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="p-3 mb-2 rounded-xl bg-primary text-primary-foreground cursor-pointer shadow-md hover:shadow-lg transition-shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointment(apt);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-lg">{apt.clientName}</div>
                          <div className="text-sm opacity-90">{apt.totalPrice}€</div>
                        </div>
                        <div className="text-sm opacity-90">
                          {format(new Date(apt.startTime), 'HH:mm')} - {format(new Date(apt.endTime), 'HH:mm')}
                        </div>
                        <div className="text-sm opacity-75 mt-1">
                          {apt.services?.map((s: any) => s.name).join(', ')}
                        </div>
                      </div>
                    ))}
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
      <Card className="p-4 bg-gradient-to-br from-background to-muted/20 border-none shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left: Title and Navigation */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">
              {viewMode === 'month' && format(selectedDate, 'MMMM yyyy', { locale: fr })}
              {viewMode === 'week' && `Semaine du ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'd MMM', { locale: fr })}`}
              {viewMode === 'day' && format(selectedDate, 'd MMMM yyyy', { locale: fr })}
            </h1>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={navigatePrev}
                className="rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                onClick={goToToday}
                className="rounded-full px-4"
              >
                Aujourd'hui
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={navigateNext}
                className="rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right: View mode and Add button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
                className="rounded-full"
              >
                Jour
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="rounded-full"
              >
                Semaine
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="rounded-full"
              >
                Mois
              </Button>
            </div>

            <Button
              onClick={() => {
                setSelectedTimeSlot('');
                setIsModalOpen(true);
              }}
              className="rounded-full shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nouveau RDV
            </Button>
          </div>
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
