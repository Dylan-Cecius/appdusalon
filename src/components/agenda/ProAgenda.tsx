import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { isSameDay, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { useOpeningHours } from '@/hooks/useOpeningHours';
import { useIsMobile } from '@/hooks/use-mobile';
import AppointmentModal from '../AppointmentModal';
import EditAppointmentModal from '../EditAppointmentModal';
import AgendaHeader from './AgendaHeader';
import AppointmentCard from './AppointmentCard';
import CurrentTimeIndicator from './CurrentTimeIndicator';
import { toast } from '@/hooks/use-toast';

const SLOT_HEIGHT = 48; // taller slots like Planity
const TIME_COL_WIDTH = 60;

const DroppableSlot = ({ id, barberId, hour, minute, isBreak, isHourStart, onClick }: {
  id: string; barberId: string; hour: number; minute: number; isBreak: boolean; isHourStart: boolean;
  onClick: () => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id, data: { barberId, hour, minute } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors",
        isHourStart ? "border-t border-white/10" : "border-t border-white/[0.04]",
        isBreak
          ? "bg-black/20 cursor-not-allowed"
          : "hover:bg-white/[0.04] cursor-pointer",
        isOver && !isBreak && "bg-white/[0.08]"
      )}
      style={{ height: `${SLOT_HEIGHT}px` }}
      onClick={() => !isBreak && onClick()}
    />
  );
};

const ProAgenda = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [draggedAppointment, setDraggedAppointment] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { appointments, updateAppointment, markAsPaid, deleteAppointment, refreshAppointments } = useSupabaseAppointments();
  const { barbers } = useSupabaseSettings();
  const { services: dbServices } = useSupabaseServices();
  const { isTimeOpen, getScheduleForDate, hasData: hasOpeningHours } = useOpeningHours();
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeBarbers = useMemo(() => barbers.filter(b => b.is_active), [barbers]);

  const categoryColors: Record<string, string> = {
    coupe: '#34d399', coloration: '#a78bfa', couleur: '#a78bfa',
    barbe: '#60a5fa', soin: '#f472b6', combo: '#fb923c',
    produit: '#94a3b8', general: '#94a3b8',
  };

  const serviceColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    dbServices.forEach(s => {
      map[s.name.toLowerCase()] = s.color || categoryColors[s.category] || '#94a3b8';
    });
    return map;
  }, [dbServices]);

  const getAppointmentColor = useCallback((services: any[]): string => {
    if (!services || services.length === 0) return '#94a3b8';
    const svc = services[0];
    const name = (svc?.name || '').toLowerCase();
    if (serviceColorMap[name]) return serviceColorMap[name];
    const cat = (svc?.category || '').toLowerCase();
    if (categoryColors[cat]) return categoryColors[cat];
    if (name.includes('barbe')) return '#60a5fa';
    if (name.includes('coupe')) return '#34d399';
    if (name.includes('color') || name.includes('mèche')) return '#a78bfa';
    if (name.includes('soin')) return '#f472b6';
    return '#94a3b8';
  }, [serviceColorMap]);

  const { timeLabels, startHour } = useMemo(() => {
    const sched = getScheduleForDate(selectedDate);
    let openH = 8, closeH = 21;

    if (hasOpeningHours && sched && sched.is_open) {
      openH = parseInt(sched.open_time.split(':')[0]);
      closeH = parseInt(sched.close_time.split(':')[0]);
      const closeM = parseInt(sched.close_time.split(':')[1] || '0');
      if (closeM > 0) closeH += 1;
    }

    const labels: { hour: number; minute: number; label: string; isBreak: boolean }[] = [];
    for (let h = openH; h < closeH; h++) {
      for (let m = 0; m < 60; m += 15) {
        let isBreak = false;
        if (sched?.break_start && sched?.break_end) {
          const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          isBreak = timeStr >= sched.break_start && timeStr < sched.break_end;
        }
        labels.push({
          hour: h,
          minute: m,
          label: m === 0 ? `${h.toString().padStart(2, '0')}:00` : '',
          isBreak,
        });
      }
    }
    return { timeLabels: labels, startHour: openH };
  }, [selectedDate, getScheduleForDate, hasOpeningHours]);

  const totalSlots = timeLabels.length;

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentSlot = (now.getHours() - startHour) * 4 + Math.floor(now.getMinutes() / 15);
      const scrollTo = Math.max(0, (currentSlot - 4) * SLOT_HEIGHT);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [startHour]);

  const dayAppointments = useMemo(() => {
    return appointments.filter(apt => isSameDay(new Date(apt.startTime), selectedDate));
  }, [appointments, selectedDate]);

  const appointmentsByBarber = useMemo(() => {
    const map: Record<string, any[]> = {};
    activeBarbers.forEach(b => { map[b.id] = []; });
    dayAppointments.forEach(apt => {
      const bid = apt.barberId || '';
      if (map[bid]) map[bid].push(apt);
    });
    return map;
  }, [dayAppointments, activeBarbers]);

  const handleSlotClick = (barberId: string, hour: number, minute: number) => {
    setSelectedBarberId(barberId);
    setSelectedTimeSlot(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (activeBarbers.length > 0 && !selectedBarberId) {
      setSelectedBarberId(activeBarbers[0].id);
    }
  }, [activeBarbers, selectedBarberId]);

  const handleDragStart = (event: DragStartEvent) => {
    const apt = event.active.data.current?.appointment;
    if (apt) setDraggedAppointment(apt);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedAppointment(null);
    const { active, over } = event;
    if (!over) return;

    const apt = active.data.current?.appointment;
    if (!apt) return;

    const dropData = over.data.current;
    if (!dropData?.barberId) return;

    const newBarberId = dropData.barberId as string;
    const newHour = dropData.hour as number;
    const newMinute = dropData.minute as number;

    const oldStart = new Date(apt.startTime);
    const oldEnd = new Date(apt.endTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(selectedDate);
    newStart.setHours(newHour, newMinute, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    if (newStart.getTime() === oldStart.getTime() && newBarberId === apt.barberId) return;

    try {
      await updateAppointment(apt.id, {
        startTime: newStart,
        endTime: newEnd,
        barberId: newBarberId,
      });
      await refreshAppointments();
      toast({ title: "RDV déplacé", description: `${apt.clientName} → ${format(newStart, 'HH:mm')}` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de déplacer le rendez-vous", variant: "destructive" });
    }
  };

  // Mobile view
  if (isMobile) {
    return (
      <div className="flex flex-col h-full bg-background">
        <AgendaHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onAddClick={() => {
            setSelectedTimeSlot('');
            setSelectedBarberId(activeBarbers[0]?.id || '');
            setIsModalOpen(true);
          }}
        />
        <div className="flex gap-1 px-3 py-2 border-b border-border/20 bg-background overflow-x-auto">
          {activeBarbers.map((barber) => (
            <button
              key={barber.id}
              onClick={() => setSelectedBarberId(barber.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                selectedBarberId === barber.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {barber.name}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-1.5">
          {(appointmentsByBarber[selectedBarberId] || [])
            .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map((apt: any) => {
              const color = getAppointmentColor(apt.services);
              const st = new Date(apt.startTime);
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/20 active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: `${color}10`, borderColor: `${color}25` }}
                  onClick={() => { setSelectedAppointment(apt); setIsEditModalOpen(true); }}
                >
                  <div className="text-sm font-mono font-medium text-muted-foreground w-12 shrink-0">{format(st, 'HH:mm')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{apt.clientName}</div>
                    <div className="text-xs text-muted-foreground truncate">{apt.services?.[0]?.name}</div>
                  </div>
                  <div className="text-sm font-semibold shrink-0">{apt.totalPrice}€</div>
                </div>
              );
            })}
          {(appointmentsByBarber[selectedBarberId] || []).length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">Aucun rendez-vous</div>
          )}
        </div>
        <AppointmentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); refreshAppointments(); }} selectedDate={selectedDate} barberId={selectedBarberId} selectedTimeSlot={selectedTimeSlot} />
        {selectedAppointment && (
          <EditAppointmentModal
            isOpen={isEditModalOpen}
            onClose={() => { setIsEditModalOpen(false); setSelectedAppointment(null); }}
            appointment={selectedAppointment}
            onUpdate={() => { setIsEditModalOpen(false); setSelectedAppointment(null); }}
            onDelete={(id) => { deleteAppointment(id); setIsEditModalOpen(false); setSelectedAppointment(null); }}
            onPay={(id) => { markAsPaid(id); setIsEditModalOpen(false); setSelectedAppointment(null); }}
          />
        )}
      </div>
    );
  }

  // Desktop view
  const barberCount = activeBarbers.length;
  const colMinWidth = barberCount <= 1 ? 300 : barberCount <= 3 ? 220 : 160;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'hsl(222 30% 12%)' }}>
        <AgendaHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onAddClick={() => {
            setSelectedTimeSlot('');
            setSelectedBarberId(activeBarbers[0]?.id || '');
            setIsModalOpen(true);
          }}
        />

        {/* Barber column headers */}
        <div
          className="flex border-b border-white/10 shrink-0"
          style={{ paddingLeft: `${TIME_COL_WIDTH}px`, backgroundColor: 'hsl(222 30% 14%)' }}
        >
          {activeBarbers.map((barber, i) => (
            <div
              key={barber.id}
              className={cn(
                "flex-1 px-3 py-2.5",
                i > 0 && "border-l border-white/10"
              )}
              style={{ minWidth: `${colMinWidth}px` }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: barber.color?.startsWith('#') ? barber.color : '#fff' }}
                />
                <span className="text-sm font-medium text-white/90">{barber.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable grid */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="flex" style={{ height: `${totalSlots * SLOT_HEIGHT}px` }}>
            {/* Time column */}
            <div
              className="sticky left-0 z-10 bg-background shrink-0"
              style={{ width: `${TIME_COL_WIDTH}px` }}
            >
              {timeLabels.map(({ hour, minute, label, isBreak }, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-end pr-3",
                    minute === 0 ? "border-t border-border/30" : "",
                    isBreak && "bg-muted/10"
                  )}
                  style={{ height: `${SLOT_HEIGHT}px` }}
                >
                  {label && (
                    <span className={cn(
                      "text-xs font-normal leading-none tabular-nums",
                      isBreak ? "text-muted-foreground/40" : "text-muted-foreground/70"
                    )}>
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Barber columns */}
            {activeBarbers.map((barber, i) => (
              <div
                key={barber.id}
                className={cn(
                  "flex-1 relative",
                  i > 0 && "border-l border-border/20"
                )}
                style={{ minWidth: `${colMinWidth}px` }}
              >
                {/* Droppable grid slots */}
                {timeLabels.map(({ hour, minute, isBreak }, idx) => (
                  <DroppableSlot
                    key={idx}
                    id={`slot|${barber.id}|${hour}|${minute}`}
                    barberId={barber.id}
                    hour={hour}
                    minute={minute}
                    isBreak={isBreak}
                    isHourStart={minute === 0}
                    onClick={() => handleSlotClick(barber.id, hour, minute)}
                  />
                ))}

                {/* Appointment cards */}
                {(appointmentsByBarber[barber.id] || []).map((apt: any) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    slotHeight={SLOT_HEIGHT}
                    startHour={startHour}
                    color={getAppointmentColor(apt.services)}
                    onClick={() => { setSelectedAppointment(apt); setIsEditModalOpen(true); }}
                  />
                ))}

                {/* Current time indicator */}
                {isSameDay(selectedDate, new Date()) && (
                  <CurrentTimeIndicator startHour={startHour} slotHeight={SLOT_HEIGHT} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {draggedAppointment && (
            <AppointmentCard
              appointment={draggedAppointment}
              slotHeight={SLOT_HEIGHT}
              startHour={startHour}
              color={getAppointmentColor(draggedAppointment.services)}
              onClick={() => {}}
              isDragOverlay
            />
          )}
        </DragOverlay>

        {/* Modals */}
        <AppointmentModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); refreshAppointments(); }} selectedDate={selectedDate} barberId={selectedBarberId} selectedTimeSlot={selectedTimeSlot} />
        {selectedAppointment && (
          <EditAppointmentModal
            isOpen={isEditModalOpen}
            onClose={() => { setIsEditModalOpen(false); setSelectedAppointment(null); }}
            appointment={selectedAppointment}
            onUpdate={() => { setIsEditModalOpen(false); setSelectedAppointment(null); }}
            onDelete={(id) => {
              deleteAppointment(id);
              setIsEditModalOpen(false);
              setSelectedAppointment(null);
              toast({ title: "Rendez-vous supprimé", description: "Le rendez-vous a été supprimé avec succès" });
            }}
            onPay={(id, method) => {
              markAsPaid(id);
              setIsEditModalOpen(false);
              setSelectedAppointment(null);
              toast({ title: "Paiement enregistré", description: `Paiement de ${selectedAppointment.totalPrice}€ par ${method}` });
            }}
          />
        )}
      </div>
    </DndContext>
  );
};

export default ProAgenda;
