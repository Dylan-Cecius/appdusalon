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

const SLOT_HEIGHT = 48;
const TIME_COL_WIDTH = 64;
const SIDEBAR_WIDTH = 180;

const jsWeekDayMap: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

const isStaffWorking = (staff: Staff, date: Date, hour: number, minute: number): boolean => {
  const dayName = jsWeekDayMap[getDay(date)];
  const ds = staff.daily_schedules;
  if (!ds || !ds[dayName]) return false;
  const daySchedule = ds[dayName];
  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return timeStr >= daySchedule.start && timeStr < daySchedule.end;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const DroppableSlot = ({ id, barberId, hour, minute, isBreak, isHourStart, isHalfHour, isAbsent, onClick }: {
  id: string; barberId: string; hour: number; minute: number; isBreak: boolean; isHourStart: boolean; isHalfHour: boolean; isAbsent: boolean;
  onClick: () => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id, data: { barberId, hour, minute } });
  const blocked = isBreak || isAbsent;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-150 relative",
        isHourStart && "border-t",
        isHalfHour && "border-t border-dashed",
        !isHourStart && !isHalfHour && "border-t",
        blocked ? "cursor-not-allowed" : "cursor-pointer",
        !blocked && "hover:bg-indigo-500/[0.04]",
        isAbsent && "bg-white/[0.012]",
        isBreak && !isAbsent && "bg-black/15",
        isOver && !blocked && "bg-indigo-500/[0.08] ring-1 ring-inset ring-indigo-500/20"
      )}
      style={{
        height: `${SLOT_HEIGHT}px`,
        borderColor: isHourStart
          ? 'rgba(255,255,255,0.07)'
          : isHalfHour
            ? 'rgba(255,255,255,0.035)'
            : 'transparent',
      }}
      onClick={() => !blocked && onClick()}
    >
      {isAbsent && isHourStart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[8px] font-semibold tracking-[0.2em] text-white/8 uppercase select-none">
            ABSENT
          </span>
        </div>
      )}
      {isAbsent && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 8px, white 8px, white 9px)',
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
  const [visibleMemberIds, setVisibleMemberIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { appointments, updateAppointment, markAsPaid, deleteAppointment, refreshAppointments } = useSupabaseAppointments();
  const { services: dbServices } = useSupabaseServices();
  const { getScheduleForDate, hasData: hasOpeningHours } = useOpeningHours();
  const { activeStaff } = useStaff();
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const agendaMembers = useMemo(() => activeStaff, [activeStaff]);

  // Initialize visible members when staff loads
  useEffect(() => {
    if (activeStaff.length > 0 && visibleMemberIds.size === 0) {
      setVisibleMemberIds(new Set(activeStaff.map(s => s.id)));
    }
  }, [activeStaff]);

  const filteredMembers = useMemo(
    () => agendaMembers.filter(m => visibleMemberIds.has(m.id)),
    [agendaMembers, visibleMemberIds]
  );

  const toggleMemberVisibility = (id: string) => {
    setVisibleMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const accentColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  // Map each member to a stable accent color for appointment blocks
  const memberColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    agendaMembers.forEach((m, i) => {
      map[m.id] = m.color?.startsWith('#') ? m.color : accentColors[i % accentColors.length];
    });
    return map;
  }, [agendaMembers]);

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

  const getAppointmentColor = useCallback((services: any[], barberId?: string): string => {
    // Use barber color if available
    if (barberId && memberColorMap[barberId]) return memberColorMap[barberId];
    if (!services || services.length === 0) return '#6366f1';
    const svc = services[0];
    const name = (svc?.name || '').toLowerCase();
    if (serviceColorMap[name]) return serviceColorMap[name];
    const cat = (svc?.category || '').toLowerCase();
    if (categoryColors[cat]) return categoryColors[cat];
    return '#6366f1';
  }, [serviceColorMap, memberColorMap]);

  const { timeLabels, startHour } = useMemo(() => {
    const sched = getScheduleForDate(selectedDate);
    let openH = 8, closeH = 20;

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
          label: m === 0 ? `${h.toString().padStart(2, '0')}:00` : m === 30 ? `${h.toString().padStart(2, '0')}:30` : '',
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

    const targetMember = agendaMembers.find(m => m.id === newBarberId);
    if (targetMember && !isStaffWorking(targetMember, selectedDate, newHour, newMinute)) {
      toast({ title: "Impossible", description: `${targetMember.name} est absent à cet horaire`, variant: "destructive" });
      return;
    }

    try {
      await updateAppointment(apt.id, { startTime: newStart, endTime: newEnd, barberId: newBarberId });
      await refreshAppointments();
      toast({ title: "RDV déplacé", description: `${apt.clientName} → ${format(newStart, 'HH:mm')}` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de déplacer le rendez-vous", variant: "destructive" });
    }
  };

  // Mobile view
  if (isMobile) {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: '#0f0f1a' }}>
        <AgendaHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          appointmentCount={dayAppointments.length}
          onAddClick={() => {
            setSelectedTimeSlot('');
            setSelectedBarberId(agendaMembers[0]?.id || '');
            setIsModalOpen(true);
          }}
        />
        <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {agendaMembers.map((member, i) => (
            <button
              key={member.id}
              onClick={() => setSelectedBarberId(member.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2",
                selectedBarberId === member.id
                  ? "text-white"
                  : "text-white/40 hover:text-white/60"
              )}
              style={{
                backgroundColor: selectedBarberId === member.id ? '#2a2a3e' : 'transparent',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: member.color?.startsWith('#') ? member.color : accentColors[i % accentColors.length] }}
              >
                {getInitials(member.name)}
              </div>
              {member.name.split(' ')[0]}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-1.5">
          {(appointmentsByMember[selectedBarberId] || [])
            .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map((apt: any) => {
              const color = getAppointmentColor(apt.services, apt.barberId);
              const st = new Date(apt.startTime);
              const et = new Date(apt.endTime);
              return (
                <div
                  key={apt.id}
                  className="flex items-center gap-3 p-3 rounded-xl active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: '#2a2a3e', borderLeft: `3px solid ${color}` }}
                  onClick={() => { setSelectedAppointment(apt); setIsEditModalOpen(true); }}
                >
                  <div className="text-sm font-mono font-medium text-white/40 w-12 shrink-0">
                    {format(st, 'HH:mm')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white truncate">{apt.clientName}</div>
                    <div className="text-xs text-white/40 truncate">{apt.services?.[0]?.name}</div>
                  </div>
                  <div className="text-sm font-semibold text-white/70 shrink-0">{apt.totalPrice}€</div>
                </div>
              );
            })}
          {(appointmentsByMember[selectedBarberId] || []).length === 0 && (
            <div className="text-center text-white/30 text-sm py-12">Aucun rendez-vous</div>
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
  const memberCount = filteredMembers.length;
  const colMinWidth = memberCount <= 1 ? 280 : memberCount <= 3 ? 200 : 160;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#0d0d1a' }}>
        <AgendaHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onToggleSidebar={() => setSidebarOpen(p => !p)}
          sidebarOpen={sidebarOpen}
          appointmentCount={dayAppointments.length}
          onAddClick={() => {
            setSelectedTimeSlot('');
            setSelectedBarberId(filteredMembers[0]?.id || agendaMembers[0]?.id || '');
            setIsModalOpen(true);
          }}
        />

        <div className="flex flex-1 overflow-hidden">
          {/* Staff filter sidebar */}
          {sidebarOpen && (
            <div
              className="shrink-0 flex flex-col border-r overflow-y-auto"
              style={{
                width: `${SIDEBAR_WIDTH}px`,
                backgroundColor: '#13131f',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="px-3 py-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Équipe</span>
              </div>
              {agendaMembers.map((member, i) => {
                const isVisible = visibleMemberIds.has(member.id);
                const memberColor = member.color?.startsWith('#') ? member.color : accentColors[i % accentColors.length];
                const dayName = jsWeekDayMap[getDay(selectedDate)];
                const worksToday = (member.working_days || []).includes(dayName);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleMemberVisibility(member.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors w-full",
                      isVisible ? "hover:bg-white/5" : "opacity-40 hover:opacity-60"
                    )}
                  >
                    <div className="relative shrink-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: isVisible ? memberColor : 'rgba(255,255,255,0.15)' }}
                      >
                        {getInitials(member.name)}
                      </div>
                      {/* Checkbox indicator */}
                      <div
                        className={cn(
                          "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center",
                          isVisible ? "border-emerald-500 bg-emerald-500" : "border-white/20 bg-transparent"
                        )}
                        style={{ borderColor: isVisible ? undefined : 'rgba(255,255,255,0.2)' }}
                      >
                        {isVisible && (
                          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className={cn("text-xs font-medium block truncate", isVisible ? "text-white/80" : "text-white/40")}>
                        {member.name}
                      </span>
                      {!worksToday && (
                        <span className="text-[9px] text-white/20 uppercase">Absent</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Main agenda area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Staff column headers */}
            <div
              className="flex shrink-0"
              style={{
                paddingLeft: `${TIME_COL_WIDTH}px`,
                backgroundColor: '#13131f',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {filteredMembers.map((member, i) => {
                const dayName = jsWeekDayMap[getDay(selectedDate)];
                const worksToday = (member.working_days || []).includes(dayName);
                const memberColor = memberColorMap[member.id] || accentColors[i % accentColors.length];
                return (
                  <div
                    key={member.id}
                    className="flex-1 px-3 py-3"
                    style={{
                      minWidth: `${colMinWidth}px`,
                      borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{
                          backgroundColor: worksToday ? memberColor : 'rgba(255,255,255,0.1)',
                        }}
                      >
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <span className={cn("text-sm font-semibold block truncate", worksToday ? "text-white/90" : "text-white/30")}>
                          {member.name}
                        </span>
                        {!worksToday && (
                          <span className="text-[10px] text-white/20 uppercase tracking-wider">Absent</span>
                        )}
                      </div>
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
                  className="sticky left-0 z-10 shrink-0"
                  style={{
                    width: `${TIME_COL_WIDTH}px`,
                    backgroundColor: '#0f0f1a',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {timeLabels.map(({ hour, minute, label, isBreak }, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start justify-end pr-3 pt-[-2px]",
                        isBreak && "opacity-30"
                      )}
                      style={{
                        height: `${SLOT_HEIGHT}px`,
                        borderTop: minute === 0
                          ? '1px solid rgba(255,255,255,0.08)'
                          : minute === 30
                            ? '1px dashed rgba(255,255,255,0.04)'
                            : '1px solid transparent',
                      }}
                    >
                      {label && (
                        <span className="text-[11px] font-mono leading-none text-white/30 -mt-1.5">
                          {label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Staff columns */}
                {filteredMembers.map((member, i) => (
                  <div
                    key={member.id}
                    className="flex-1 relative"
                    style={{
                      minWidth: `${colMinWidth}px`,
                      backgroundColor: '#1a1a2e',
                      borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                    }}
                  >
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
                          isHalfHour={minute === 30}
                          isAbsent={absent}
                          onClick={() => handleSlotClick(member.id, hour, minute)}
                        />
                      );
                    })}

                    {(appointmentsByMember[member.id] || []).map((apt: any) => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        slotHeight={SLOT_HEIGHT}
                        startHour={startHour}
                        color={getAppointmentColor(apt.services, apt.barberId)}
                        onClick={() => { setSelectedAppointment(apt); setIsEditModalOpen(true); }}
                      />
                    ))}

                    {isSameDay(selectedDate, new Date()) && (
                      <CurrentTimeIndicator startHour={startHour} slotHeight={SLOT_HEIGHT} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {draggedAppointment && (
            <AppointmentCard
              appointment={draggedAppointment}
              slotHeight={SLOT_HEIGHT}
              startHour={startHour}
              color={getAppointmentColor(draggedAppointment.services, draggedAppointment.barberId)}
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
