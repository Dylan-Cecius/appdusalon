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

// Hauteur d'un créneau de 15 min : calculée pour que toute la journée tienne à l'écran
const DEFAULT_SLOT_HEIGHT = 48;
const MIN_SLOT_HEIGHT = 10;
// Marge au-dessus de la grille pour que le libellé de la première heure ne soit pas coupé
const GRID_TOP_GAP = 10;
const TIME_COL_WIDTH = 64;
// Teintes des services (accent). Le fond pastel des cartes en est dérivé.
const SERVICE_PALETTE = [
  '#7A6AE6', // lavande
  '#F0974A', // pêche
  '#3BA776', // menthe
  '#E0689A', // rose
  '#4A97D9', // ciel
  '#D9B11E', // citron
  '#B565CF', // lilas
  '#E36D5B', // corail
  '#7BA04A', // sauge
  '#2FA3A3', // turquoise
];
const NEUTRAL_SERVICE_COLOR = '#8A86A3';
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

const DroppableSlot = ({ id, barberId, hour, minute, isBreak, isHourStart, isHalfHour, isAbsent, slotHeight, onClick }: {
  slotHeight: number;
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
        !blocked && "hover:bg-primary/[0.06]",
        isAbsent && "bg-muted",
        isBreak && !isAbsent && "bg-muted/60",
        isOver && !blocked && "bg-primary/10 ring-1 ring-inset ring-primary/40"
      )}
      style={{
        height: `${slotHeight}px`,
        borderColor: isHourStart
          ? 'hsl(var(--border))'
          : isHalfHour
            ? 'hsl(var(--border) / 0.55)'
            : 'transparent',
      }}
      onClick={() => !blocked && onClick()}
    >
      {isAbsent && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 8px, hsl(var(--ink)) 8px, hsl(var(--ink)) 9px)',
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

  const accentColors = ['#4A3AD6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  // Map each member to a stable accent color for appointment blocks
  const memberColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    agendaMembers.forEach((m, i) => {
      map[m.id] = m.color?.startsWith('#') ? m.color : accentColors[i % accentColors.length];
    });
    return map;
  }, [agendaMembers]);

  // Un code couleur par service : chaque service reçoit une teinte de la palette,
  // dans l'ordre de la liste des services. Les cartes l'affichent en version pastel.
  const serviceColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    dbServices.forEach((s, i) => {
      map[s.name.toLowerCase()] = SERVICE_PALETTE[i % SERVICE_PALETTE.length];
    });
    return map;
  }, [dbServices]);

  const getAppointmentColor = useCallback((services: any[], _barberId?: string): string => {
    const name = (services?.[0]?.name || '').toLowerCase();
    return serviceColorMap[name] || NEUTRAL_SERVICE_COLOR;
  }, [serviceColorMap]);

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

  // Ajuste la hauteur des créneaux à la place disponible : la plage d'ouverture
  // (réglée dans Paramètres > Horaires) tient à l'écran sans défilement.
  const [slotHeight, setSlotHeight] = useState(DEFAULT_SLOT_HEIGHT);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || totalSlots === 0) return;
    const fit = () => {
      const available = el.clientHeight - GRID_TOP_GAP - 2;
      if (available <= 0) return;
      const perSlot = Math.floor((available / totalSlots) * 100) / 100;
      setSlotHeight(Math.min(DEFAULT_SLOT_HEIGHT, Math.max(MIN_SLOT_HEIGHT, perSlot)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [totalSlots, isMobile]);

  const dayAppointments = useMemo(() => {
    return appointments.filter(apt => isSameDay(new Date(apt.startTime), selectedDate));
  }, [appointments, selectedDate]);

  const dayServiceLegend = useMemo(() => {
    const seen = new Map<string, string>();
    dayAppointments.forEach((apt: any) => {
      const name = apt.services?.[0]?.name;
      if (name && !seen.has(name)) seen.set(name, getAppointmentColor(apt.services));
    });
    return Array.from(seen, ([name, color]) => ({ name, color }));
  }, [dayAppointments, getAppointmentColor]);

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
      <div className="flex flex-col h-full overflow-hidden rounded-2xl border border-border bg-card">
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
        <div className="flex gap-2 px-3 py-2.5 overflow-x-auto border-b border-border">
          {agendaMembers.map((member, i) => (
            <button
              key={member.id}
              onClick={() => setSelectedBarberId(member.id)}
              className={cn(
                "px-3.5 min-h-[44px] rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 border",
                selectedBarberId === member.id
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
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
                  className="flex items-center gap-3 p-3 rounded-none text-foreground active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, white)`, borderLeft: `4px solid ${color}` }}
                  onClick={() => { setSelectedAppointment(apt); setIsEditModalOpen(true); }}
                >
                  <div className="text-sm font-semibold tabular-nums w-12 shrink-0">
                    {format(st, 'HH:mm')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{apt.clientName}</div>
                    <div className="text-xs text-foreground/75 truncate">{apt.services?.[0]?.name}</div>
                  </div>
                  <div className="text-sm font-semibold shrink-0">{apt.totalPrice} €</div>
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
  const memberCount = filteredMembers.length;
  const colMinWidth = memberCount <= 1 ? 280 : memberCount <= 3 ? 200 : 160;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full overflow-hidden rounded-2xl border border-border bg-card">
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
          <div
            className="shrink-0 flex flex-col border-r border-border bg-background overflow-y-auto transition-all duration-300 ease-out"
            style={{
              width: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0px',
              opacity: sidebarOpen ? 1 : 0,
              overflow: sidebarOpen ? 'auto' : 'hidden',
            }}
          >
            <div className="px-3 pt-4 pb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Équipe</span>
            </div>
            {agendaMembers.map((member, i) => {
              const isVisible = visibleMemberIds.has(member.id);
              const memberColor = member.color?.startsWith('#') ? member.color : accentColors[i % accentColors.length];
              const dayName = jsWeekDayMap[getDay(selectedDate)];
              const worksToday = (member.working_days || []).includes(dayName);
              const aptCount = (appointmentsByMember[member.id] || []).length;
              return (
                <button
                  key={member.id}
                  onClick={() => toggleMemberVisibility(member.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 text-left w-full transition-all duration-200",
                    isVisible
                      ? "hover:bg-muted"
                      : "opacity-60 hover:opacity-80"
                  )}
                  aria-pressed={isVisible}
                >
                  <div className="relative shrink-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white transition-colors duration-200"
                      style={{
                        backgroundColor: isVisible ? memberColor : 'hsl(var(--muted-foreground))',
                      }}
                    >
                      {getInitials(member.name)}
                    </div>
                    <div
                      className={cn(
                        "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200",
                        isVisible ? "bg-emerald-600 border-background" : "bg-background border-border"
                      )}
                    >
                      {isVisible && (
                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium block truncate text-foreground">
                      {member.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {!worksToday ? (
                        <span className="text-[11px] text-red-700 font-medium">Absent</span>
                      ) : aptCount > 0 ? (
                        <span className="text-[11px] text-muted-foreground">{aptCount} RDV</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Libre</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Légende : couleur de chaque service présent ce jour-là */}
            {dayServiceLegend.length > 0 && (
              <div className="mt-2 border-t border-border px-3 pt-4 pb-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Services</span>
                <ul className="mt-2 space-y-1.5">
                  {dayServiceLegend.map(({ name, color }) => (
                    <li key={name} className="flex items-center gap-2 text-xs text-foreground">
                      <span
                        className="h-4 w-4 shrink-0 rounded-none"
                        style={{ backgroundColor: `color-mix(in srgb, ${color} 30%, white)`, boxShadow: `inset 0 0 0 1.5px ${color}` }}
                      />
                      <span className="truncate">{name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Main agenda area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Staff column headers */}
            <div
              className="flex shrink-0 border-b border-border bg-card"
              style={{ paddingLeft: `${TIME_COL_WIDTH}px` }}
            >
              {filteredMembers.map((member, i) => {
                const dayName = jsWeekDayMap[getDay(selectedDate)];
                const worksToday = (member.working_days || []).includes(dayName);
                const memberColor = memberColorMap[member.id] || accentColors[i % accentColors.length];
                const aptCount = (appointmentsByMember[member.id] || []).length;
                return (
                  <div
                    key={member.id}
                    className="flex-1 px-3 py-3"
                    style={{
                      minWidth: `${colMinWidth}px`,
                      borderLeft: '1px solid hsl(var(--border))',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 transition-colors duration-200"
                        style={{
                          backgroundColor: worksToday ? memberColor : 'hsl(var(--muted-foreground))',
                        }}
                      >
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <span className={cn("text-[15px] font-semibold block truncate", worksToday ? "text-foreground" : "text-muted-foreground")}>
                          {member.name}
                        </span>
                        {!worksToday ? (
                          <span className="text-xs text-red-700 font-medium">Absent</span>
                        ) : aptCount > 0 ? (
                          <span className="text-xs text-muted-foreground">{aptCount} rendez-vous</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Libre</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scrollable grid */}
            <div ref={scrollRef} className="flex-1 overflow-auto">
              <div className="flex" style={{ height: `${totalSlots * slotHeight}px`, marginTop: `${GRID_TOP_GAP}px` }}>
                {/* Time column */}
                <div
                  className="sticky left-0 z-10 shrink-0 bg-card"
                  style={{ width: `${TIME_COL_WIDTH}px` }}
                >
                  {timeLabels.map(({ hour, minute, label, isBreak }, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-start justify-end pr-3",
                        isBreak && "opacity-60"
                      )}
                      style={{ height: `${slotHeight}px` }}
                    >
                      {label && (minute === 0 || slotHeight >= 14) && (
                        <span className={cn(
                          "leading-none -mt-1.5 tabular-nums bg-card",
                          minute === 0
                            ? "text-xs text-foreground font-semibold"
                            : "text-[11px] text-muted-foreground"
                        )}>
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
                      borderLeft: '1px solid hsl(var(--border))',
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
                          slotHeight={slotHeight}
                          onClick={() => handleSlotClick(member.id, hour, minute)}
                        />
                      );
                    })}

                    {(appointmentsByMember[member.id] || []).map((apt: any) => (
                      <AppointmentCard
                        key={apt.id}
                        appointment={apt}
                        slotHeight={slotHeight}
                        startHour={startHour}
                        color={getAppointmentColor(apt.services, apt.barberId)}
                        onClick={() => { setSelectedAppointment(apt); setIsEditModalOpen(true); }}
                      />
                    ))}

                    {isSameDay(selectedDate, new Date()) && (
                      <CurrentTimeIndicator startHour={startHour} slotHeight={slotHeight} />
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
              slotHeight={slotHeight}
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
