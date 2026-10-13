import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { addDays, format, getDay, isSameDay, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Service } from '@/hooks/useSupabaseServices';
import type { DaySchedule } from '@/hooks/useOpeningHours';
import type { Staff } from '@/hooks/useStaff';
import { useIsMobile } from '@/hooks/use-mobile';
import EditAppointmentModal from '../EditAppointmentModal';
import AgendaHeader, { AgendaSlotInterval, AgendaViewMode } from './AgendaHeader';
import AppointmentCard from './AppointmentCard';
import AgendaSearchDialog from './AgendaSearchDialog';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import AppointmentTimeline from './AppointmentTimeline';
import { appointmentPalette } from '@/lib/appointmentPalette';
import type { Appointment } from '@/data/appointments';
import BookingWaitlistPanel from './BookingWaitlistPanel';
import CurrentTimeIndicator from './CurrentTimeIndicator';
import { Calendar as MiniCalendar } from '@/components/ui/calendar';
import { CalendarDays, Check, Clock3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';
import type { WaitlistRequest, WaitlistService, WaitlistSlot } from '@/lib/waitlistSlots';

const TIME_COL_WIDTH = 64;
const SIDEBAR_WIDTH = 224;

const jsWeekDayMap: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

const isStaffWorking = (
  staff: Staff,
  date: Date,
  hour: number,
  minute: number
): boolean => {
  const dayName = jsWeekDayMap[getDay(date)];
  const schedule = staff.daily_schedules?.[dayName];
  if (!schedule) return false;

  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return time >= schedule.start && time < schedule.end;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const DroppableSlot = ({
  id,
  memberId,
  hour,
  minute,
  isBreak,
  isHourStart,
  isHalfHour,
  isAbsent,
  slotHeight,
  onClick,
}: {
  id: string;
  memberId: string;
  hour: number;
  minute: number;
  isBreak: boolean;
  isHourStart: boolean;
  isHalfHour: boolean;
  isAbsent: boolean;
  slotHeight: number;
  onClick: () => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { barberId: memberId, hour, minute },
  });

  const blocked = isBreak || isAbsent;

  return (
    <div
      ref={setNodeRef}
      data-slot-member={memberId}
      data-slot-hour={hour}
      data-slot-minute={minute}
      className={cn(
        'relative transition-colors duration-100',
        blocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-primary/[0.035]',
        isAbsent && 'bg-slate-50/70',
        isBreak && !isAbsent && 'bg-amber-50/70',
        isOver && !blocked && 'bg-primary/[0.08] ring-1 ring-inset ring-primary/20'
      )}
      style={{
        height: `${slotHeight}px`,
        borderTop: isHourStart
          ? '1px solid hsl(var(--border))'
          : isHalfHour
            ? '1px dashed hsl(var(--border) / 0.7)'
            : '1px solid hsl(var(--border) / 0.35)',
      }}
      onClick={() => !blocked && onClick()}
    >
      {isAbsent && isHourStart && (
        <span className="pointer-events-none absolute inset-x-0 top-2 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300">
          absent
        </span>
      )}
      {isBreak && !isAbsent && isHourStart && (
        <span className="pointer-events-none absolute inset-x-0 top-2 text-center text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400">
          pause
        </span>
      )}
    </div>
  );
};

export type AgendaCreateDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  staffId?: string;
  selectedTimeSlot?: string;
};

export type AgendaWorkspaceProps = {
  appointments: Appointment[];
  appointmentsLoading: boolean;
  dbServices: (WaitlistService & Pick<Service, 'color' | 'category'>)[];
  activeStaff: Staff[];
  getScheduleForDate: (date: Date) => DaySchedule | null;
  hasOpeningHours: boolean;
  waitlistEntries: BookingWaitlistEntry[];
  waitlistLoading: boolean;
  cancelWaitlistEntry: (id: string) => Promise<void>;
  addWaitlistEntry?: (entry: WaitlistRequest) => Promise<void>;
  bookWaitlistEntry?: (entry: BookingWaitlistEntry, slot: WaitlistSlot) => Promise<void>;
  waitlistTimezone?: string;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<void>;
  markAsPaid: (id: string, method: 'cash' | 'card') => Promise<void>;
  cancelAppointment: (id: string, action: 'cancel' | 'no_show') => Promise<void>;
  refreshAppointments: () => Promise<void>;
  renderCreateDialog: (props: AgendaCreateDialogProps) => ReactNode;
};

export const AgendaWorkspace = ({ appointments, appointmentsLoading, dbServices, activeStaff,
  getScheduleForDate, hasOpeningHours, waitlistEntries, waitlistLoading, cancelWaitlistEntry,
  updateAppointment, markAsPaid, cancelAppointment, refreshAppointments, renderCreateDialog,
  addWaitlistEntry, bookWaitlistEntry, waitlistTimezone,
}: AgendaWorkspaceProps) => {
  const waitlistCount = waitlistEntries.length;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<AgendaViewMode>('day');
  const [slotInterval, setSlotInterval] = useState<AgendaSlotInterval>(15);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedBarberId, setSelectedBarberId] = useState('');
  const [draggedAppointment, setDraggedAppointment] = useState<any>(null);
  const [visibleMemberIds, setVisibleMemberIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const agendaMembers = useMemo(() => activeStaff, [activeStaff]);

  useEffect(() => {
    if (activeStaff.length > 0 && visibleMemberIds.size === 0) {
      setVisibleMemberIds(new Set(activeStaff.map((staff) => staff.id)));
    }
  }, [activeStaff, visibleMemberIds.size]);

  const filteredMembers = useMemo(
    () => agendaMembers.filter((member) => visibleMemberIds.has(member.id)),
    [agendaMembers, visibleMemberIds]
  );

  useEffect(() => {
    if (agendaMembers.length > 0 && !selectedBarberId) {
      setSelectedBarberId(agendaMembers[0].id);
    }
  }, [agendaMembers, selectedBarberId]);

  const toggleMemberVisibility = (id: string) => {
    setVisibleMemberIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const accentColors = [
    '#4f46e5',
    '#7c3aed',
    '#db2777',
    '#d97706',
    '#059669',
    '#2563eb',
    '#dc2626',
  ];

  const memberColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    agendaMembers.forEach((member, index) => {
      map[member.id] =
        member.color?.startsWith('#')
          ? member.color
          : accentColors[index % accentColors.length];
    });
    return map;
  }, [agendaMembers]);

  const categoryColors: Record<string, string> = {
    coupe: '#059669',
    coloration: '#7c3aed',
    couleur: '#7c3aed',
    barbe: '#2563eb',
    soin: '#db2777',
    combo: '#d97706',
    produit: '#64748b',
    general: '#64748b',
  };

  const serviceColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    dbServices.forEach((service) => {
      map[String(service.name || '').toLowerCase()] =
        service.color || categoryColors[service.category] || '#64748b';
    });
    return map;
  }, [dbServices]);

  const getAppointmentColor = useCallback(
    (services: any[], memberId?: string): string => {
      if (!services?.length) return (memberId && memberColorMap[memberId]) || '#64748b';

      const service = services[0];
      const name = String(service?.name || '').toLowerCase();
      if (serviceColorMap[name]) return serviceColorMap[name];

      const category = String(service?.category || '').toLowerCase();
      return categoryColors[category] || '#64748b';
    },
    [memberColorMap, serviceColorMap]
  );

  const slotHeight = slotInterval === 15 ? 30 : 44;

  const { timeLabels, startHour } = useMemo(() => {
    const schedule = getScheduleForDate(selectedDate);
    let openHour = 8;
    let closeHour = 20;

    if (hasOpeningHours && schedule?.is_open) {
      openHour = Number.parseInt(schedule.open_time.split(':')[0], 10);
      closeHour = Number.parseInt(schedule.close_time.split(':')[0], 10);
      const closeMinutes = Number.parseInt(schedule.close_time.split(':')[1] || '0', 10);
      if (closeMinutes > 0) closeHour += 1;
    }

    const labels: {
      hour: number;
      minute: number;
      label: string;
      isBreak: boolean;
    }[] = [];

    for (let hour = openHour; hour < closeHour; hour += 1) {
      for (let minute = 0; minute < 60; minute += slotInterval) {
        let isBreak = false;

        if (schedule?.break_start && schedule?.break_end) {
          const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          isBreak = time >= schedule.break_start && time < schedule.break_end;
        }

        labels.push({
          hour,
          minute,
          label:
            minute === 0
              ? `${String(hour).padStart(2, '0')}:00`
              : slotInterval === 30
                ? `${String(hour).padStart(2, '0')}:30`
                : '',
          isBreak,
        });
      }
    }

    return { timeLabels: labels, startHour: openHour };
  }, [getScheduleForDate, hasOpeningHours, selectedDate, slotInterval]);

  useEffect(() => {
    if (!scrollRef.current || viewMode !== 'day') return;

    const now = new Date();
    if (!isSameDay(now, selectedDate)) {
      scrollRef.current.scrollTop = 0;
      return;
    }

    const minutesFromStart = (now.getHours() - startHour) * 60 + now.getMinutes();
    const currentSlot = minutesFromStart / slotInterval;
    scrollRef.current.scrollTop = Math.max(0, (currentSlot - 4) * slotHeight);
  }, [selectedDate, slotHeight, slotInterval, startHour, viewMode]);

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => isSameDay(new Date(appointment.startTime), selectedDate))
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        ),
    [appointments, selectedDate]
  );

  const appointmentsByMember = useMemo(() => {
    const map: Record<string, any[]> = {};
    agendaMembers.forEach((member) => {
      map[member.id] = [];
    });

    dayAppointments.forEach((appointment) => {
      const memberId = appointment.staffId || appointment.barberId || '';
      if (map[memberId]) map[memberId].push(appointment);
    });

    return map;
  }, [agendaMembers, dayAppointments]);

  const weekStart = useMemo(
    () => startOfWeek(selectedDate, { weekStartsOn: 1 }),
    [selectedDate]
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const visibleWeekAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const memberId = appointment.staffId || appointment.barberId || '';
        const appointmentDate = new Date(appointment.startTime);
        return (
          visibleMemberIds.has(memberId) &&
          weekDays.some((day) => isSameDay(day, appointmentDate))
        );
      }),
    [appointments, visibleMemberIds, weekDays]
  );

  const displayedAppointmentCount =
    viewMode === 'day'
      ? dayAppointments.filter((appointment) =>
          isMobile
            ? (appointment.staffId || appointment.barberId) === selectedBarberId
            : visibleMemberIds.has(appointment.staffId || appointment.barberId || '')
        ).length
      : visibleWeekAppointments.length;

  const handleSlotClick = (memberId: string, hour: number, minute: number) => {
    setSelectedBarberId(memberId);
    setSelectedTimeSlot(
      `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    );
    setIsModalOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const appointment = event.active.data.current?.appointment;
    if (appointment) setDraggedAppointment(appointment);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setDraggedAppointment(null);

    const { active, over } = event;
    if (!over || viewMode !== 'day') return;

    const appointment = active.data.current?.appointment;
    if (!appointment) return;

    const dropData = over.data.current;
    if (!dropData?.barberId) return;

    const newStaffId = dropData.barberId as string;
    const newHour = dropData.hour as number;
    const newMinute = dropData.minute as number;

    const oldStart = new Date(appointment.startTime);
    const oldEnd = new Date(appointment.endTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();

    const newStart = new Date(selectedDate);
    newStart.setHours(newHour, newMinute, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    if (
      newStart.getTime() === oldStart.getTime() &&
      newStaffId === (appointment.staffId || appointment.barberId)
    ) {
      return;
    }

    const targetMember = agendaMembers.find((member) => member.id === newStaffId);
    if (
      targetMember &&
      !isStaffWorking(targetMember, selectedDate, newHour, newMinute)
    ) {
      toast({
        title: 'Créneau indisponible',
        description: `${targetMember.name} ne travaille pas à cet horaire.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateAppointment(appointment.id, {
        startTime: newStart,
        endTime: newEnd,
        staffId: newStaffId,
      });
      await refreshAppointments();
      toast({
        title: 'Rendez-vous déplacé',
        description: `${appointment.clientName} → ${format(newStart, 'HH:mm')}`,
      });
    } catch {
      toast({
        title: 'Déplacement impossible',
        description: 'Le nouveau créneau est indisponible.',
        variant: 'destructive',
      });
    }
  };

  const openAppointment = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsEditModalOpen(true);
  };

  const openSearchResult = (appointment: Appointment) => {
    setSelectedDate(new Date(appointment.startTime));
    const memberId = appointment.staffId || appointment.barberId || '';
    if (agendaMembers.some(member => member.id === memberId)) {
      setSelectedBarberId(memberId);
      setVisibleMemberIds(previous => new Set([...previous, memberId]));
    }
    setViewMode('day');
    openAppointment(appointment);
  };

  const openNewAppointment = (date = selectedDate, memberId?: string) => {
    setSelectedDate(date);
    setSelectedTimeSlot('');
    setSelectedBarberId(memberId || filteredMembers[0]?.id || agendaMembers[0]?.id || '');
    setIsModalOpen(true);
  };

  const renderMobileDay = () => (
    <>
      <div className="flex gap-2 overflow-x-auto border-b border-border bg-card px-3 py-2.5">
        {agendaMembers.map((member, index) => {
          const color = memberColorMap[member.id] || accentColors[index % accentColors.length];
          const active = selectedBarberId === member.id;

          return (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedBarberId(member.id)}
              aria-pressed={active}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                active
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground'
              )}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {getInitials(member.name)}
              </span>
              {member.name.split(' ')[0]}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-3">
        <div className="space-y-2">
          {(appointmentsByMember[selectedBarberId] || []).map((appointment: any) => {
            const color = getAppointmentColor(
              appointment.services,
              appointment.staffId || appointment.barberId
            );
            const palette = appointmentPalette(color);

            return (
              <button
                type="button"
                key={appointment.id}
                onClick={() => openAppointment(appointment)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm"
                style={{ borderColor: palette.border, borderLeft: `4px solid ${palette.accent}`, backgroundColor: palette.background }}
              >
                <div className="w-14 shrink-0 text-sm font-bold tabular-nums text-foreground">
                  {format(new Date(appointment.startTime), 'HH:mm')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{appointment.clientName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {appointment.services?.[0]?.name}
                  </div>
                  <div className="mt-1"><AppointmentStatusBadge appointment={appointment} /></div>
                  <AppointmentTimeline appointment={appointment} compact />
                </div>
                <div className="text-sm font-semibold">
                  {Number(appointment.totalPrice || 0).toFixed(0)} €
                </div>
              </button>
            );
          })}

          {(appointmentsByMember[selectedBarberId] || []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium">Aucun rendez-vous</p>
              <button
                type="button"
                onClick={() => openNewAppointment(selectedDate, selectedBarberId)}
                className="mt-3 text-sm font-semibold text-primary"
              >
                Ajouter un rendez-vous
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderWeekOverview = (mobile = false) => (
    <div className={cn('flex-1 overflow-auto bg-slate-50', mobile ? 'p-3' : 'p-4')}>
      <div
        className={cn(
          'grid gap-3',
          mobile ? 'grid-cols-1' : 'min-w-[980px] grid-cols-7'
        )}
      >
        {weekDays.map((day) => {
          const dayAppointmentsVisible = visibleWeekAppointments
            .filter((appointment) =>
              isSameDay(new Date(appointment.startTime), day)
            )
            .sort(
              (a, b) =>
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );

          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={cn(
                'min-h-[360px] overflow-hidden rounded-2xl border bg-card shadow-sm',
                isToday ? 'border-primary/40 ring-1 ring-primary/10' : 'border-border'
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(day);
                  setViewMode('day');
                }}
                className={cn(
                  'flex w-full items-center justify-between border-b px-3 py-3 text-left transition-colors hover:bg-muted/50',
                  isToday && 'bg-primary/[0.04]'
                )}
              >
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {format(day, 'EEE', { locale: fr })}
                  </div>
                  <div className={cn('text-xl font-bold', isToday && 'text-primary')}>
                    {format(day, 'd')}
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                  {dayAppointmentsVisible.length}
                </span>
              </button>

              <div className="space-y-2 p-2">
                {dayAppointmentsVisible.map((appointment: any) => {
                  const memberId = appointment.staffId || appointment.barberId || '';
                  const member = agendaMembers.find((item) => item.id === memberId);
                  const color = getAppointmentColor(appointment.services, memberId);
                  const palette = appointmentPalette(color);

                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={() => openAppointment(appointment)}
                      className="w-full rounded-xl border bg-background p-2.5 text-left transition-shadow hover:shadow-sm"
                      style={{ borderColor: palette.border, borderLeft: `4px solid ${palette.accent}`, backgroundColor: palette.background }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold tabular-nums">
                          {format(new Date(appointment.startTime), 'HH:mm')}
                        </span>
                        <span className="text-[9px] font-semibold text-muted-foreground">
                          {member?.name.split(' ')[0] || ''}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-xs font-semibold">
                        {appointment.clientName}
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {appointment.services?.[0]?.name || 'Rendez-vous'}
                      </div>
                      <div className="mt-1.5"><AppointmentStatusBadge appointment={appointment} /></div>
                      <AppointmentTimeline appointment={appointment} compact />
                    </button>
                  );
                })}

                {dayAppointmentsVisible.length === 0 && (
                  <button
                    type="button"
                    onClick={() => openNewAppointment(day)}
                    className="flex min-h-24 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/[0.03] hover:text-primary"
                  >
                    <Clock3 className="h-4 w-4" />
                    <span className="mt-1 text-[10px] font-semibold">Libre</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSidebar = () => (
    <aside
      className="shrink-0 overflow-y-auto border-r border-border bg-card transition-[width,opacity] duration-200"
      style={{
        width: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0px',
        opacity: sidebarOpen ? 1 : 0,
        overflow: sidebarOpen ? 'auto' : 'hidden',
      }}
    >
      <div className="border-b border-border p-3">
        <MiniCalendar
          key={format(selectedDate, 'yyyy-MM')}
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          locale={fr}
          weekStartsOn={1}
          className="w-full p-0 [&_th]:w-7 [&_td]:w-7 [&_td_button]:w-7"
        />
      </div>

      <div className="border-b border-border px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Collaborateurs
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground">
            {filteredMembers.length}/{agendaMembers.length}
          </span>
        </div>
      </div>

      <div className="p-2">
        {agendaMembers.map((member, index) => {
          const visible = visibleMemberIds.has(member.id);
          const color = memberColorMap[member.id] || accentColors[index % accentColors.length];
          const appointmentCount =
            viewMode === 'day'
              ? (appointmentsByMember[member.id] || []).length
              : visibleWeekAppointments.filter(
                  (appointment) =>
                    (appointment.staffId || appointment.barberId) === member.id
                ).length;

          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggleMemberVisibility(member.id)}
              aria-pressed={visible}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors',
                visible ? 'hover:bg-muted' : 'opacity-45 hover:bg-muted/60'
              )}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: visible ? color : '#94a3b8' }}
              >
                {getInitials(member.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold">{member.name}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {appointmentCount} RDV
                </span>
              </span>
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-md border',
                  visible
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background'
                )}
              >
                {visible && <Check className="h-3 w-3" />}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );

  const renderDayGrid = () => {
    const memberCount = filteredMembers.length;
    const columnMinWidth =
      memberCount <= 1 ? 320 : memberCount <= 3 ? 230 : 190;

    return (
      <div ref={scrollRef} data-testid="agenda-scroll" className="min-w-0 flex-1 overflow-auto bg-white">
        <div style={{ minWidth: TIME_COL_WIDTH + memberCount * columnMinWidth }}>
        <div
          className="sticky top-0 z-30 flex border-b border-border bg-card"
        >
          <div aria-hidden="true" className="sticky left-0 z-10 shrink-0 border-r border-border bg-card" style={{ width: TIME_COL_WIDTH }} />
          {filteredMembers.map((member, index) => {
            const dayName = jsWeekDayMap[getDay(selectedDate)];
            const worksToday = Boolean(member.daily_schedules?.[dayName]);
            const color = memberColorMap[member.id] || accentColors[index % accentColors.length];
            const appointmentCount = (appointmentsByMember[member.id] || []).length;

            return (
              <div
                key={member.id}
                data-member-header={member.id}
                className="flex-1 border-l border-border px-3 py-2.5"
                style={{ minWidth: `${columnMinWidth}px` }}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: worksToday ? color : '#cbd5e1' }}
                  >
                    {getInitials(member.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold">{member.name}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {worksToday ? `${appointmentCount} rendez-vous` : 'Absent'}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

          <div
            className="flex"
            style={{ height: `${timeLabels.length * slotHeight}px` }}
          >
            <div
              data-testid="agenda-hours"
              className="sticky left-0 z-20 shrink-0 bg-card"
              style={{
                width: `${TIME_COL_WIDTH}px`,
                borderRight: '1px solid hsl(var(--border))',
              }}
            >
              {timeLabels.map(({ minute, label, isBreak }, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start justify-end pr-2.5 pt-1',
                    isBreak && 'bg-amber-50/50'
                  )}
                  style={{
                    height: `${slotHeight}px`,
                    borderTop:
                      minute === 0
                        ? '1px solid hsl(var(--border))'
                        : '1px solid hsl(var(--border) / 0.35)',
                  }}
                >
                  {label && (
                    <span
                      className={cn(
                        'font-mono text-[10px] font-semibold tabular-nums',
                        minute === 0 ? 'text-slate-500' : 'text-slate-300'
                      )}
                    >
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {filteredMembers.map((member, index) => (
              <div
                key={member.id}
                data-member-column={member.id}
                className="relative flex-1 border-l border-border bg-white"
                style={{ minWidth: `${columnMinWidth}px` }}
              >
                {timeLabels.map(({ hour, minute, isBreak }, slotIndex) => (
                  <DroppableSlot
                    key={slotIndex}
                    id={`slot|${member.id}|${hour}|${minute}`}
                    memberId={member.id}
                    hour={hour}
                    minute={minute}
                    isBreak={isBreak}
                    isHourStart={minute === 0}
                    isHalfHour={minute === 30}
                    isAbsent={!isStaffWorking(member, selectedDate, hour, minute)}
                    slotHeight={slotHeight}
                    onClick={() => handleSlotClick(member.id, hour, minute)}
                  />
                ))}

                {(appointmentsByMember[member.id] || []).map((appointment: any) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    slotHeight={slotHeight}
                    startHour={startHour}
                    minutesPerSlot={slotInterval}
                    color={getAppointmentColor(
                      appointment.services,
                      appointment.staffId || appointment.barberId
                    )}
                    onClick={() => openAppointment(appointment)}
                  />
                ))}

                {isSameDay(selectedDate, new Date()) && (
                  <CurrentTimeIndicator
                    startHour={startHour}
                    slotHeight={slotHeight}
                    minutesPerSlot={slotInterval}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const body = isMobile ? (
    <div className="flex min-h-[calc(100vh-210px)] flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <AgendaHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        appointmentCount={displayedAppointmentCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        slotInterval={slotInterval}
        onSlotIntervalChange={setSlotInterval}
        onAddClick={() => openNewAppointment()}
        waitlistCount={waitlistCount}
        onWaitlistClick={() => setWaitlistOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />
      {viewMode === 'day' ? renderMobileDay() : renderWeekOverview(true)}
    </div>
  ) : (
    <div className="flex h-[calc(100vh-205px)] min-h-[650px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <AgendaHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onToggleSidebar={() => setSidebarOpen((previous) => !previous)}
        sidebarOpen={sidebarOpen}
        appointmentCount={displayedAppointmentCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        slotInterval={slotInterval}
        onSlotIntervalChange={setSlotInterval}
        onAddClick={() => openNewAppointment()}
        waitlistCount={waitlistCount}
        onWaitlistClick={() => setWaitlistOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {renderSidebar()}
        {viewMode === 'day' ? renderDayGrid() : renderWeekOverview()}
      </div>
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {body}

      <AgendaSearchDialog open={searchOpen} onOpenChange={setSearchOpen} appointments={appointments} members={agendaMembers} loading={appointmentsLoading} onSelect={openSearchResult} />

      <DragOverlay dropAnimation={{ duration: 160, easing: 'ease' }}>
        {draggedAppointment && (
          <AppointmentCard
            appointment={draggedAppointment}
            slotHeight={slotHeight}
            startHour={startHour}
            minutesPerSlot={slotInterval}
            color={getAppointmentColor(
              draggedAppointment.services,
              draggedAppointment.staffId || draggedAppointment.barberId
            )}
            onClick={() => {}}
            isDragOverlay
          />
        )}
      </DragOverlay>

      {renderCreateDialog({
        isOpen: isModalOpen,
        onClose: () => {
          setIsModalOpen(false);
          void refreshAppointments();
        },
        selectedDate,
        staffId: selectedBarberId,
        selectedTimeSlot,
      })}

      <BookingWaitlistPanel
        open={waitlistOpen}
        onOpenChange={setWaitlistOpen}
        entries={waitlistEntries}
        loading={waitlistLoading}
        onCancel={cancelWaitlistEntry}
        services={dbServices} staff={activeStaff} appointments={appointments}
        schedule={getScheduleForDate} timezone={waitlistTimezone}
        onAdd={addWaitlistEntry}
        onBook={bookWaitlistEntry ? async (entry, slot) => {
          await bookWaitlistEntry(entry, slot);
          setSelectedDate(new Date(slot.startTime)); setSelectedBarberId(slot.staffId);
          setVisibleMemberIds(previous => new Set([...previous, slot.staffId]));
          setViewMode('day'); setWaitlistOpen(false);
          toast({ title: 'Rendez-vous créé', description: `${entry.client_name} a été retiré de la liste d’attente.` });
        } : undefined}
      />

      {selectedAppointment && (
        <EditAppointmentModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onUpdate={async (id, updates) => {
            await updateAppointment(id, updates);
            await refreshAppointments();
          }}
          onCancel={(id) => {
            void cancelAppointment(id, 'cancel');
            setIsEditModalOpen(false);
            setSelectedAppointment(null);
          }}
          onNoShow={(id) => {
            void cancelAppointment(id, 'no_show');
            setIsEditModalOpen(false);
            setSelectedAppointment(null);
          }}
          onPay={async (id, method) => {
            await markAsPaid(id, method);
            setIsEditModalOpen(false);
            setSelectedAppointment(null);
          }}
        />
      )}
    </DndContext>
  );
};

export default AgendaWorkspace;
