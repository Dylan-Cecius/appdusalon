import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Users, Clock3, BellRing, Search } from 'lucide-react';
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
  waitlistCount?: number;
  onWaitlistClick?: () => void;
  onSearchClick?: () => void;
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
  waitlistCount = 0,
  onWaitlistClick,
  onSearchClick,
}: AgendaHeaderProps) => {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [mobileDatePickerOpen, setMobileDatePickerOpen] = useState(false);
  const selectDate = (date?: Date) => {
    if (!date) return;
    onDateChange(date);
    setDatePickerOpen(false);
    setMobileDatePickerOpen(false);
  };
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
    <div className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                sidebarOpen
                  ? 'border-slate-300 bg-slate-100 text-slate-800'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
              )}
              title="Afficher ou masquer les collaborateurs"
              aria-label="Afficher ou masquer les collaborateurs"
              aria-pressed={sidebarOpen}
            >
              <Users className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
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
                'h-7 rounded-md px-3 text-[11px] font-semibold transition-colors',
                isToday ? 'bg-slate-900 text-white' : 'text-foreground hover:bg-muted'
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

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Choisir une date : ${periodLabel}`}
                className="hidden min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-slate-50 sm:flex"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-semibold capitalize text-slate-900">
                  {periodLabel}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={selectedDate}
                defaultMonth={selectedDate}
                onSelect={selectDate}
                locale={fr}
                weekStartsOn={1}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {appointmentCount > 0 && (
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 lg:inline-flex">
              {appointmentCount} RDV
            </span>
          )}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {onViewModeChange && (
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(['day', 'week'] as AgendaViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onViewModeChange(mode)}
                  aria-pressed={viewMode === mode}
                  className={cn(
                    'h-7 rounded-md px-3 text-[11px] font-semibold transition-colors',
                    viewMode === mode
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {mode === 'day' ? 'Jour' : 'Semaine'}
                </button>
              ))}
            </div>
          )}

          {onSearchClick && (
            <button type="button" onClick={onSearchClick} aria-label="Rechercher un rendez-vous" title="Rechercher un rendez-vous" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
              <Search className="h-4 w-4" />
            </button>
          )}

          {onWaitlistClick && (
            <button
              type="button"
              onClick={onWaitlistClick}
              aria-label={`Liste d’attente${waitlistCount > 0 ? `, ${waitlistCount} demandes` : ''}`}
              title="Liste d’attente"
              className="relative flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <BellRing className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Liste d’attente</span>
              {waitlistCount > 0 && (
                <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                  {waitlistCount}
                </span>
              )}
            </button>
          )}

          {viewMode === 'day' && onSlotIntervalChange && (
            <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 xl:flex">
              <Clock3 className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
              {([15, 30] as AgendaSlotInterval[]).map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => onSlotIntervalChange(minutes)}
                  aria-pressed={slotInterval === minutes}
                  className={cn(
                    'h-8 rounded-lg px-2.5 text-[11px] font-semibold transition-colors',
                    slotInterval === minutes
                      ? 'bg-white text-slate-900 shadow-sm'
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
            aria-label="Nouveau rendez-vous"
            title="Nouveau rendez-vous"
            className="ml-auto flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98] sm:ml-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveau RDV</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2 sm:hidden">
        <Popover open={mobileDatePickerOpen} onOpenChange={setMobileDatePickerOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-label={`Choisir une date : ${periodLabel}`} className="flex min-w-0 items-center gap-2 rounded-lg py-1 text-left">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-xs font-semibold capitalize">{periodLabel}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker mode="single" selected={selectedDate} defaultMonth={selectedDate} onSelect={selectDate} locale={fr} weekStartsOn={1} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{appointmentCount} RDV</span>
      </div>
    </div>
  );
};

export default AgendaHeader;
