import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { isSameDay, format, getDay } from 'date-fns';
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
import { useSupabaseServices } from '@/hooks/useSupabaseServices';
import { useOpeningHours } from '@/hooks/useOpeningHours';
import { useStaff, Staff } from '@/hooks/useStaff';
import { useIsMobile } from '@/hooks/use-mobile';
import AppointmentModal from '../AppointmentModal';
import EditAppointmentModal from '../EditAppointmentModal';
import AgendaHeader from './AgendaHeader';
import AppointmentCard from './AppointmentCard';
import CurrentTimeIndicator from './CurrentTimeIndicator';
import { toast } from '@/hooks/use-toast';

const SLOT_HEIGHT = 72;
const TIME_COL_WIDTH = 60;

// Map JS getDay (0=Sun) to day names
const jsWeekDayMap: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

/** Check if a staff member works at a given time slot on a given date */
const isStaffWorking = (staff: Staff, date: Date, hour: number, minute: number): boolean => {
  const dayName = jsWeekDayMap[getDay(date)];
  const ds = staff.daily_schedules;
  if (!ds || !ds[dayName]) return false;
  const daySchedule = ds[dayName];
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return timeStr >= daySchedule.start && timeStr < daySchedule.end;
};

const DroppableSlot = ({ id, barberId, hour, minute, isBreak, isHourStart, isAbsent, onClick }: {
  id: string; barberId: string; hour: number; minute: number; isBreak: boolean; isHourStart: boolean; isAbsent: boolean;
  onClick: () => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id, data: { barberId, hour, minute } });
  const blocked = isBreak || isAbsent;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors relative",
        isHourStart ? "border-t border-white/10" : "border-t border-white/[0.04]",
        blocked
          ? "cursor-not-allowed"
          : "hover:bg-white/[0.04] cursor-pointer",
        isAbsent && "bg-white/[0.02]",
        isBreak && !isAbsent && "bg-black/20",
        isOver && !blocked && "bg-white/[0.08]"
      )}
      style={{ height: `${SLOT_HEIGHT}px` }}
      onClick={() => !blocked && onClick()}
    >
      {/* Show ABSENT label on the hour mark for absent slots */}
      {isAbsent && isHourStart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-semibold tracking-widest text-white/15 uppercase select-none">
            ABSENT
          </span>
        </div>
      )}
      {/* Diagonal hatching for absent slots */}
      {isAbsent && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 6px, white 6px, white 7px)',
          }}
        />
      )}
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
  const { services: dbServices } = useSupabaseServices();
  const { getScheduleForDate, hasData: hasOpeningHours } = useOpeningHours();
  const { activeStaff } = useStaff();
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Use staff as agenda columns
  const agendaMembers = useMemo(() => activeStaff, [activeStaff]);

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

  // Map appointments by staff ID (using barberId field which stores the staff/barber id)
  const appointmentsByMember = useMemo(() => {
    const map: Record<string, any[]> = {};
    agendaMembers.forEach(m => { map[m.id] = []; });
    dayAppointments.forEach(apt => {
      const bid = apt.barberId || '';
      if (map[bid]) map[bid].push(apt);
    });
    return map;
  }, [dayAppointments, agendaMembers]);

  const handleSlotClick = (memberId: string, hour: number, minute: number) => {
    setSelectedBarberId(memberId);
    setSelectedTimeSlot(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (agendaMembers.length > 0 && !selectedBarberId) {
      setSelectedBarberId(agendaMembers[0].id);
    }
  }, [agendaMembers, selectedBarberId]);

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

    // Check if staff works at that time
    const targetMember = agendaMembers.find(m => m.id === newBarberId);
    if (targetMember && !isStaffWorking(targetMember, selectedDate, newHour, newMinute)) {
      toast({ title: "Impossible", description: `${targetMember.name} est absent à cet horaire`, variant: "destructive" });
      return;
    }

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
            setSelectedBarberId(agendaMembers[0]?.id || '');
            setIsModalOpen(true);
          }}
        />
        <div className="flex gap-1 px-3 py-2 border-b border-border/20 bg-background overflow-x-auto">
          {agendaMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedBarberId(member.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                selectedBarberId === member.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {member.name}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-1.5">
          {(appointmentsByMember[selectedBarberId] || [])
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
          {(appointmentsByMember[selectedBarberId] || []).length === 0 && (
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
  const memberCount = agendaMembers.length;
  const colMinWidth = memberCount <= 1 ? 300 : memberCount <= 3 ? 220 : 160;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'hsl(222 30% 12%)' }}>
        <AgendaHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onAddClick={() => {
            setSelectedTimeSlot('');
            setSelectedBarberId(agendaMembers[0]?.id || '');
            setIsModalOpen(true);
          }}
        />

        {/* Member column headers */}
        <div
          className="flex border-b border-white/10 shrink-0"
          style={{ paddingLeft: `${TIME_COL_WIDTH}px`, backgroundColor: 'hsl(222 30% 14%)' }}
        >
          {agendaMembers.map((member, i) => {
            const dayName = jsWeekDayMap[getDay(selectedDate)];
            const worksToday = (member.working_days || []).includes(dayName);
            return (
              <div
                key={member.id}
                className={cn(
                  "flex-1 px-3 py-2.5",
                  i > 0 && "border-l border-white/10"
                )}
                style={{ minWidth: `${colMinWidth}px` }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: member.color?.startsWith('#') ? member.color : '#fff' }}
                  />
                  <span className={cn("text-sm font-medium", worksToday ? "text-white/90" : "text-white/40")}>
                    {member.name}
                  </span>
                  {!worksToday && (
                    <span className="text-[10px] text-white/25 uppercase tracking-wider">Absent</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable grid */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          <div className="flex" style={{ height: `${totalSlots * SLOT_HEIGHT}px` }}>
            {/* Time column */}
            <div
              className="sticky left-0 z-10 shrink-0 border-r border-white/10"
              style={{ width: `${TIME_COL_WIDTH}px`, backgroundColor: 'hsl(222 30% 12%)' }}
            >
              {timeLabels.map(({ hour, minute, label, isBreak }, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-end pr-3",
                    minute === 0 ? "border-t border-white/10" : "border-t border-white/[0.04]",
                    isBreak && "opacity-30"
                  )}
                  style={{ height: `${SLOT_HEIGHT}px` }}
                >
                  {label && (
                    <span className="text-xs font-normal leading-none tabular-nums text-white/50">
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Member columns */}
            {agendaMembers.map((member, i) => (
              <div
                key={member.id}
                className={cn(
                  "flex-1 relative",
                  i > 0 && "border-l border-white/10"
                )}
                style={{ minWidth: `${colMinWidth}px` }}
              >
                {/* Droppable grid slots */}
                {timeLabels.map(({ hour, minute, isBreak }, idx) => {
                  const absent = !isStaffWorking(member, selectedDate, hour, minute);
                  return (
                    <DroppableSlot
                      key={idx}
                      id={`slot|${member.id}|${hour}|${minute}`}
                      barberId={member.id}
                      hour={hour}
                      minute={minute}
                      isBreak={isBreak}
                      isHourStart={minute === 0}
                      isAbsent={absent}
                      onClick={() => handleSlotClick(member.id, hour, minute)}
                    />
                  );
                })}

                {/* Appointment cards */}
                {(appointmentsByMember[member.id] || []).map((apt: any) => (
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
