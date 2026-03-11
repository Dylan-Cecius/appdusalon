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

const SLOT_HEIGHT = 20; // px per 15-min slot
const START_HOUR = 8;
const END_HOUR = 21;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 4;
const TIME_COL_WIDTH = 56; // px

// Droppable slot component
const DroppableSlot = ({ id, hour, minute, isOpen, onClick, children }: {
  id: string; hour: number; minute: number; isOpen: boolean;
  onClick: () => void; children?: React.ReactNode;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id, data: { hour, minute } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-b transition-colors",
        minute === 0 ? "border-border/30" : "border-border/10",
        isOpen
          ? "hover:bg-primary/5 cursor-pointer"
          : "bg-muted/20 cursor-not-allowed",
        isOver && isOpen && "bg-primary/10"
      )}
      style={{ height: `${SLOT_HEIGHT}px` }}
      onClick={() => isOpen && onClick()}
    >
      {children}
    </div>
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
  const { isTimeOpen, hasData: hasOpeningHours } = useOpeningHours();
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeBarbers = useMemo(() => barbers.filter(b => b.is_active), [barbers]);

  const categoryColors: Record<string, string> = {
    coupe: '#10B981', coloration: '#8B5CF6', couleur: '#8B5CF6',
    barbe: '#3B82F6', soin: '#EC4899', combo: '#F97316',
    produit: '#6B7280', general: '#6B7280',
  };

  const serviceColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    dbServices.forEach(s => {
      map[s.name.toLowerCase()] = s.color || categoryColors[s.category] || '#6B7280';
    });
    return map;
  }, [dbServices]);

  const getAppointmentColor = useCallback((services: any[]): string => {
    if (!services || services.length === 0) return '#6B7280';
    const svc = services[0];
    const name = (svc?.name || '').toLowerCase();
    if (serviceColorMap[name]) return serviceColorMap[name];
    const cat = (svc?.category || '').toLowerCase();
    if (categoryColors[cat]) return categoryColors[cat];
    if (name.includes('barbe')) return '#3B82F6';
    if (name.includes('coupe')) return '#10B981';
    if (name.includes('color') || name.includes('mèche')) return '#8B5CF6';
    if (name.includes('soin')) return '#EC4899';
    return '#6B7280';
  }, [serviceColorMap]);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentSlot = (now.getHours() - START_HOUR) * 4 + Math.floor(now.getMinutes() / 15);
      const scrollTo = Math.max(0, (currentSlot - 4) * SLOT_HEIGHT);
      scrollRef.current.scrollTop = scrollTo;
    }
  }, []);

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
    const checkDate = new Date(selectedDate);
    checkDate.setHours(hour, minute, 0, 0);
    if (hasOpeningHours && !isTimeOpen(checkDate)) return;
    setSelectedBarberId(barberId);
    setSelectedTimeSlot(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    setIsModalOpen(true);
  };

  const timeLabels = useMemo(() => {
    const labels: { hour: number; minute: number; label: string }[] = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      for (let m = 0; m < 60; m += 15) {
        labels.push({ hour: h, minute: m, label: m === 0 ? `${h.toString().padStart(2, '0')}:00` : '' });
      }
    }
    return labels;
  }, []);

  const isSlotOpen = useCallback((hour: number, minute: number) => {
    if (!hasOpeningHours) return true;
    const checkDate = new Date(selectedDate);
    checkDate.setHours(hour, minute, 0, 0);
    return isTimeOpen(checkDate);
  }, [hasOpeningHours, selectedDate, isTimeOpen]);

  useEffect(() => {
    if (activeBarbers.length > 0 && !selectedBarberId) {
      setSelectedBarberId(activeBarbers[0].id);
    }
  }, [activeBarbers, selectedBarberId]);

  // Drag handlers
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

    // Parse droppable id: "slot-{barberId}-{hour}-{minute}"
    const parts = over.id.toString().split('-');
    if (parts[0] !== 'slot' || parts.length < 4) return;

    const newBarberId = parts[1];
    const newHour = parseInt(parts[2]);
    const newMinute = parseInt(parts[3]);

    // Calculate new times
    const oldStart = new Date(apt.startTime);
    const oldEnd = new Date(apt.endTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(selectedDate);
    newStart.setHours(newHour, newMinute, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    // Skip if nothing changed
    if (newStart.getTime() === oldStart.getTime() && newBarberId === apt.barberId) return;

    try {
      await updateAppointment(apt.id, {
        startTime: newStart,
        endTime: newEnd,
        barberId: newBarberId,
      });
      toast({
        title: "RDV déplacé",
        description: `${apt.clientName} → ${format(newStart, 'HH:mm')}`,
      });
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
        <div className="flex gap-1 px-3 py-2 border-b border-border/30 bg-muted/20 overflow-x-auto">
          {activeBarbers.map((barber) => (
            <button
              key={barber.id}
              onClick={() => setSelectedBarberId(barber.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                selectedBarberId === barber.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:bg-muted/50"
              )}
            >
              {barber.name}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {(appointmentsByBarber[selectedBarberId] || [])
            .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map((apt: any) => {
              const color = getAppointmentColor(apt.services);
              const startTime = new Date(apt.startTime);
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30 shadow-sm active:scale-[0.98] transition-transform"
                  style={{ borderLeft: `4px solid ${color}` }}
                  onClick={() => { setSelectedAppointment(apt); setIsEditModalOpen(true); }}
                >
                  <div className="text-sm font-mono font-bold text-muted-foreground w-14 shrink-0">{format(startTime, 'HH:mm')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{apt.clientName}</div>
                    <div className="text-xs text-muted-foreground truncate">{apt.services?.[0]?.name}</div>
                  </div>
                  <div className="text-sm font-bold shrink-0">{apt.totalPrice}€</div>
                </div>
              );
            })}
          {(appointmentsByBarber[selectedBarberId] || []).length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-12">Aucun rendez-vous</div>
          )}
        </div>
        <AppointmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedDate={selectedDate} barberId={selectedBarberId} selectedTimeSlot={selectedTimeSlot} />
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

  // Desktop view with DnD
  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full bg-background rounded-xl border border-border/50 shadow-sm overflow-hidden">
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
        <div className="flex border-b border-border/50 bg-muted/10" style={{ paddingLeft: `${TIME_COL_WIDTH}px` }}>
          {activeBarbers.map((barber) => (
            <div key={barber.id} className="flex-1 min-w-[140px] px-3 py-2.5 text-center border-l border-border/30">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  backgroundColor: barber.color?.startsWith('#') ? `${barber.color}15` : undefined,
                  color: barber.color?.startsWith('#') ? barber.color : undefined,
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: barber.color?.startsWith('#') ? barber.color : undefined }} />
                {barber.name}
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable grid */}
        <div ref={scrollRef} className="flex-1 overflow-auto relative">
          <div className="flex" style={{ height: `${TOTAL_SLOTS * SLOT_HEIGHT}px` }}>
            {/* Time column */}
            <div className="sticky left-0 z-10 bg-background border-r border-border/30" style={{ width: `${TIME_COL_WIDTH}px` }}>
              {timeLabels.map(({ hour, minute, label }, idx) => (
                <div key={idx} className="border-b border-border/10 flex items-start justify-end pr-2" style={{ height: `${SLOT_HEIGHT}px` }}>
                  {label && <span className="text-[10px] font-medium text-muted-foreground -mt-1.5">{label}</span>}
                </div>
              ))}
            </div>

            {/* Barber columns */}
            {activeBarbers.map((barber) => (
              <div key={barber.id} className="flex-1 min-w-[140px] border-l border-border/30 relative">
                {/* Droppable grid slots */}
                {timeLabels.map(({ hour, minute }, idx) => {
                  const open = isSlotOpen(hour, minute);
                  return (
                    <DroppableSlot
                      key={idx}
                      id={`slot-${barber.id}-${hour}-${minute}`}
                      hour={hour}
                      minute={minute}
                      isOpen={open}
                      onClick={() => handleSlotClick(barber.id, hour, minute)}
                    />
                  );
                })}

                {/* Appointment cards */}
                {(appointmentsByBarber[barber.id] || []).map((apt: any) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    slotHeight={SLOT_HEIGHT}
                    startHour={START_HOUR}
                    color={getAppointmentColor(apt.services)}
                    onClick={() => { setSelectedAppointment(apt); setIsEditModalOpen(true); }}
                  />
                ))}

                {isSameDay(selectedDate, new Date()) && (
                  <CurrentTimeIndicator startHour={START_HOUR} slotHeight={SLOT_HEIGHT} />
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
              startHour={START_HOUR}
              color={getAppointmentColor(draggedAppointment.services)}
              onClick={() => {}}
              isDragOverlay
            />
          )}
        </DragOverlay>

        {/* Modals */}
        <AppointmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedDate={selectedDate} barberId={selectedBarberId} selectedTimeSlot={selectedTimeSlot} />
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
