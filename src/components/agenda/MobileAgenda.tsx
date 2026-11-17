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
  onAdd: (barberId?: string) => void;
  onOpen: (appointment: any) => void;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const MobileAgenda = ({ selectedDate, onDateChange, members, memberColors, appointments, onAdd, onOpen }: MobileAgendaProps) => {
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

      {/* Liste */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
          <p className="text-[15px] font-semibold text-foreground">Aucun rendez-vous</p>
          <p className="mt-1 text-sm text-muted-foreground">Touchez + pour en ajouter un.</p>
        </div>
      ) : (
        <div className="space-y-2.5 pb-20">
          {visible.map((apt) => {
            const start = new Date(apt.startTime);
            const end = new Date(apt.endTime);
            const services = (apt.services || []).map((s: any) => s?.name).filter(Boolean).join(' + ');
            const staff = memberName(apt.barberId);
            return (
              <div key={apt.id} className="flex items-stretch gap-3">
                <div className="w-12 shrink-0 pt-3.5">
                  <p className="text-sm font-bold text-foreground">{format(start, 'HH:mm')}</p>
                  <p className="text-xs text-muted-foreground">{format(end, 'HH:mm')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(apt)}
                  className="min-w-0 flex-1 rounded-2xl border border-border bg-card px-4 py-3.5 text-left transition-colors active:bg-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate text-[15px] font-semibold text-foreground">{apt.clientName}</p>
                    <p className="shrink-0 text-sm font-bold text-foreground">{Number(apt.totalPrice).toFixed(0)} €</p>
                  </div>
                  {services && <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{services}</p>}
                  {staff && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: memberColors[apt.barberId] || '#6366f1' }}
                      />
                      {staff}
                    </p>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

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
