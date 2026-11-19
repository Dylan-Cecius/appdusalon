import { appointmentLabel, hasClientName } from '@/lib/appointmentLabel';
import { useMemo, useState } from 'react';
import { addDays, addWeeks, format, isSameDay, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Staff } from '@/hooks/useStaff';

interface MobileAgendaProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  members: Staff[];
  memberColors: Record<string, string>;
  /** Rendez-vous du jour sélectionné */
  appointments: any[];
  /** Horaires du jour, en minutes depuis minuit */
  openMinute: number;
  closeMinute: number;
  /** Débuts des créneaux de pause (minutes depuis minuit, pas de 30 min) */
  breakMinutes: Set<number>;
  onAdd: (barberId?: string, time?: string) => void;
  onOpen: (appointment: any) => void;
}

const SLOT_MINUTES = 30;
const PX_PER_MIN = 1.2; // 72 px par heure : un créneau de 30 min fait 36 px, assez pour le doigt

const toLabel = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const MobileAgenda = ({ selectedDate, onDateChange, members, memberColors, appointments, openMinute, closeMinute, breakMinutes, onAdd, onOpen }: MobileAgendaProps) => {
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const today = new Date();

  const weekDays = useMemo(() => {
    const monday = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [selectedDate]);

  const visible = useMemo(
    () =>
      appointments
        .filter((apt) => memberFilter === 'all' || apt.barberId === memberFilter)
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [appointments, memberFilter]
  );

  const memberName = (id?: string) => members.find((m) => m.id === id)?.name.split(' ')[0];
  const isToday = isSameDay(selectedDate, today);
  const nowMinute = today.getHours() * 60 + today.getMinutes();

  // Rendez-vous placés sur la grille : minutes depuis minuit + colonne en cas de chevauchement
  const placed = useMemo(() => {
    const events = visible.map((apt) => {
      const s = new Date(apt.startTime);
      const e = new Date(apt.endTime);
      const start = s.getHours() * 60 + s.getMinutes();
      const rawEnd = isSameDay(s, e) ? e.getHours() * 60 + e.getMinutes() : 24 * 60;
      return { apt, start, end: Math.max(rawEnd, start + 15), lane: 0, lanes: 1 };
    });
    let cluster: typeof events = [];
    let clusterEnd = -1;
    let laneEnds: number[] = [];
    const closeCluster = () => {
      cluster.forEach((event) => { event.lanes = laneEnds.length; });
      cluster = [];
      laneEnds = [];
    };
    events.forEach((event) => {
      if (event.start >= clusterEnd) closeCluster();
      let lane = laneEnds.findIndex((end) => end <= event.start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = event.end;
      event.lane = lane;
      cluster.push(event);
      clusterEnd = Math.max(clusterEnd, event.end);
    });
    closeCluster();
    return events;
  }, [visible]);

  // Plage affichée : horaires d'ouverture, élargis si un rendez-vous déborde
  const { rangeStart, rangeEnd, slots, hourMarks } = useMemo(() => {
    let startMin = openMinute;
    let endMin = closeMinute;
    placed.forEach((event) => {
      startMin = Math.min(startMin, Math.floor(event.start / 60) * 60);
      endMin = Math.max(endMin, Math.ceil(event.end / 60) * 60);
    });
    const slotList: { minute: number; isBreak: boolean }[] = [];
    for (let minute = startMin; minute < endMin; minute += SLOT_MINUTES) {
      slotList.push({ minute, isBreak: breakMinutes.has(minute) });
    }
    const marks: number[] = [];
    for (let minute = startMin; minute <= endMin; minute += 60) marks.push(minute);
    return { rangeStart: startMin, rangeEnd: endMin, slots: slotList, hourMarks: marks };
  }, [openMinute, closeMinute, breakMinutes, placed]);

  const gridHeight = (rangeEnd - rangeStart) * PX_PER_MIN;

  return (
    <div className="space-y-4">
      {/* Mois + navigation semaine */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium capitalize text-muted-foreground">
            {format(selectedDate, 'MMMM yyyy', { locale: fr })}
          </p>
          <h1 className="text-[26px] font-bold leading-tight text-foreground">Agenda</h1>
        </div>
        <div className="flex items-center gap-1.5">
          {!isToday && (
            <button
              type="button"
              onClick={() => onDateChange(new Date())}
              className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-primary active:bg-muted"
            >
              Aujourd'hui
            </button>
          )}
          <button
            type="button"
            aria-label="Semaine précédente"
            onClick={() => onDateChange(addWeeks(selectedDate, -1))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground active:bg-muted"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Semaine suivante"
            onClick={() => onDateChange(addWeeks(selectedDate, 1))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground active:bg-muted"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Bandeau des jours */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDays.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const dayIsToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateChange(day)}
              aria-label={format(day, 'EEEE d MMMM', { locale: fr })}
              aria-pressed={selected}
              className={cn(
                'flex min-h-[62px] flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-foreground active:bg-muted'
              )}
            >
              <span className={cn('text-[11px] font-semibold uppercase', !selected && 'text-muted-foreground')}>
                {format(day, 'EEEEE', { locale: fr })}
              </span>
              <span className="text-base font-bold">{format(day, 'd')}</span>
              <span
                className={cn(
                  'h-1 w-1 rounded-full',
                  dayIsToday ? (selected ? 'bg-gold' : 'bg-primary') : 'bg-transparent'
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Filtre équipe */}
      {members.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            onClick={() => setMemberFilter('all')}
            className={cn(
              'h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors',
              memberFilter === 'all' ? 'border-ink bg-ink text-white' : 'border-border bg-card text-foreground'
            )}
          >
            Toute l'équipe
          </button>
          {members.map((member) => {
            const active = memberFilter === member.id;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => setMemberFilter(member.id)}
                className={cn(
                  'flex h-11 shrink-0 items-center gap-2 rounded-full border pl-1.5 pr-4 text-sm font-semibold transition-colors',
                  active ? 'border-ink bg-ink text-white' : 'border-border bg-card text-foreground'
                )}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ backgroundColor: memberColors[member.id] || '#6366f1' }}
                >
                  {getInitials(member.name)}
                </span>
                {member.name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      )}

      {/* Titre du jour */}
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-bold capitalize text-foreground">
          {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
        </h2>
        <span className="text-sm font-medium text-muted-foreground">{visible.length} rendez-vous</span>
      </div>

      {/* Grille horaire de la journée */}
      {visible.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun rendez-vous. Touchez un créneau pour en ajouter un.</p>
      )}
      <div className="flex pb-20">
        {/* Heures */}
        <div className="relative w-11 shrink-0" style={{ height: gridHeight }}>
          {hourMarks.map((minute) => (
            <span
              key={minute}
              className="absolute left-0 -translate-y-1/2 text-xs font-semibold text-muted-foreground"
              style={{ top: (minute - rangeStart) * PX_PER_MIN }}
            >
              {toLabel(minute)}
            </span>
          ))}
        </div>

        {/* Créneaux + rendez-vous */}
        <div
          className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card"
          style={{ height: gridHeight }}
        >
          {slots.map((slot) => (
            <button
              key={slot.minute}
              type="button"
              aria-label={`Nouveau rendez-vous à ${toLabel(slot.minute)}`}
              onClick={() => onAdd(memberFilter === 'all' ? undefined : memberFilter, toLabel(slot.minute))}
              className={cn(
                'absolute inset-x-0 border-t transition-colors active:bg-accent',
                slot.minute % 60 === 0 ? 'border-border' : 'border-dashed border-border/60',
                slot.minute === rangeStart && 'border-t-0',
                slot.isBreak && 'bg-muted'
              )}
              style={{ top: (slot.minute - rangeStart) * PX_PER_MIN, height: SLOT_MINUTES * PX_PER_MIN }}
            />
          ))}

          {placed.map(({ apt, start, end, lane, lanes }) => {
            const color = memberColors[apt.barberId] || '#6366f1';
            const height = Math.max((end - start) * PX_PER_MIN - 2, 30);
            const services = (apt.services || []).map((s: any) => s?.name).filter(Boolean).join(' + ');
            const staff = memberName(apt.barberId);
            return (
              <button
                key={apt.id}
                type="button"
                onClick={() => onOpen(apt)}
                className="absolute z-10 overflow-hidden rounded-xl border px-2 py-1 text-left active:opacity-80"
                style={{
                  top: (start - rangeStart) * PX_PER_MIN + 1,
                  height,
                  left: `calc(${(lane / lanes) * 100}% + 3px)`,
                  width: `calc(${100 / lanes}% - 6px)`,
                  backgroundColor: `color-mix(in srgb, ${color} 16%, hsl(var(--card)))`,
                  borderColor: `color-mix(in srgb, ${color} 45%, hsl(var(--card)))`,
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate text-[13px] font-semibold leading-tight text-foreground">{appointmentLabel(apt)}</span>
                </span>
                {height >= 46 && (
                  <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
                    {toLabel(start)} – {toLabel(end)}
                    {services && hasClientName(apt) ? ` · ${services}` : ''}
                  </span>
                )}
                {height >= 64 && staff && (
                  <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">{staff}</span>
                )}
              </button>
            );
          })}

          {isToday && nowMinute >= rangeStart && nowMinute <= rangeEnd && (
            <div
              className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
              style={{ top: (nowMinute - rangeStart) * PX_PER_MIN }}
              aria-hidden="true"
            >
              <span className="-ml-1 h-2 w-2 rounded-full bg-destructive" />
              <span className="h-px flex-1 bg-destructive" />
            </div>
          )}
        </div>
      </div>

      {/* Nouveau rendez-vous */}
      <button
        type="button"
        aria-label="Nouveau rendez-vous"
        onClick={() => onAdd(memberFilter === 'all' ? undefined : memberFilter)}
        className="fixed bottom-[calc(62px+env(safe-area-inset-bottom)+1rem)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary text-primary-foreground shadow-[0_10px_24px_hsl(var(--primary)/0.35)] active:scale-95 md:hidden"
      >
        <Plus className="h-6 w-6" strokeWidth={2.4} />
      </button>
    </div>
  );
};

export default MobileAgenda;
