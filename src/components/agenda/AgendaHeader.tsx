import { ChevronLeft, ChevronRight, Plus, CalendarDays, Users, Clock3 } from 'lucide-react';
import { addDays, addWeeks, endOfWeek, format, isSameDay, startOfWeek, subDays, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

export type AgendaViewMode = 'day' | 'week';
export type AgendaSlotInterval = 15 | 30;

interface AgendaHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddClick: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  appointmentCount?: number;
  viewMode?: AgendaViewMode;
  onViewModeChange?: (mode: AgendaViewMode) => void;
  slotInterval?: AgendaSlotInterval;
  onSlotIntervalChange?: (minutes: AgendaSlotInterval) => void;
}

const AgendaHeader = ({
  selectedDate,
  onDateChange,
  onAddClick,
  onToggleSidebar,
  sidebarOpen,
  appointmentCount = 0,
  viewMode = 'day',
  onViewModeChange,
  slotInterval = 15,
  onSlotIntervalChange,
}: AgendaHeaderProps) => {
  const isToday = isSameDay(selectedDate, new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

  const goPrevious = () =>
    onDateChange(viewMode === 'week' ? subWeeks(selectedDate, 1) : subDays(selectedDate, 1));

  const goNext = () =>
    onDateChange(viewMode === 'week' ? addWeeks(selectedDate, 1) : addDays(selectedDate, 1));

  const periodLabel =
    viewMode === 'week'
      ? `${format(weekStart, 'd MMM', { locale: fr })} – ${format(weekEnd, 'd MMM yyyy', { locale: fr })}`
      : format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });

  return (
    <div className="shrink-0 border-b border-border/80 bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                sidebarOpen
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              )}
              title="Afficher ou masquer les collaborateurs"
            >
              <Users className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center rounded-xl border border-border bg-background p-0.5">
            <button
              type="button"
              onClick={goPrevious}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Période précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onDateChange(new Date())}
              className={cn(
                'h-8 rounded-lg px-3 text-xs font-semibold transition-colors',
                isToday ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
              )}
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Période suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="hidden min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted sm:flex"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-semibold capitalize text-foreground">
                  {periodLabel}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && onDateChange(date)}
                locale={fr}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {appointmentCount > 0 && (
            <span className="hidden rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground lg:inline-flex">
              {appointmentCount} RDV
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onViewModeChange && (
            <div className="flex rounded-xl border border-border bg-background p-0.5">
              {(['day', 'week'] as AgendaViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewModeChange(mode)}
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs font-semibold transition-colors',
                    viewMode === mode
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {mode === 'day' ? 'Jour' : 'Semaine'}
                </button>
              ))}
            </div>
          )}

          {viewMode === 'day' && onSlotIntervalChange && (
            <div className="hidden items-center rounded-xl border border-border bg-background p-0.5 xl:flex">
              <Clock3 className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
              {([15, 30] as AgendaSlotInterval[]).map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => onSlotIntervalChange(minutes)}
                  className={cn(
                    'h-8 rounded-lg px-2.5 text-[11px] font-semibold transition-colors',
                    slotInterval === minutes
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onAddClick}
            className="flex h-9 items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau RDV</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 sm:hidden">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-xs font-semibold capitalize">{periodLabel}</span>
        </button>
        <span className="text-[11px] font-medium text-muted-foreground">{appointmentCount} RDV</span>
      </div>
    </div>
  );
};

export default AgendaHeader;
