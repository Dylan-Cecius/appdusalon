import { ChevronLeft, ChevronRight, ChevronDown, Plus, Users } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

interface AgendaHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddClick: () => void;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  appointmentCount?: number;
}

const navButton =
  'h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors';

const AgendaHeader = ({ selectedDate, onDateChange, onAddClick, onToggleSidebar, sidebarOpen, appointmentCount = 0 }: AgendaHeaderProps) => {
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-5 shrink-0 border-b border-border bg-card">
      {/* Date + compteur */}
      <div className="flex items-center gap-3 min-w-0">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-xl px-2 py-1 -ml-2 hover:bg-muted transition-colors min-w-0"
              aria-label="Choisir une date"
            >
              <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground capitalize truncate">
                {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              locale={fr}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <span className="hidden sm:inline-flex shrink-0 items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          {appointmentCount === 0
            ? 'Aucun rendez-vous'
            : `${appointmentCount} rendez-vous`}
        </span>
      </div>

      {/* Navigation + actions */}
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? "Masquer l'équipe" : "Afficher l'équipe"}
            aria-pressed={sidebarOpen}
            className={cn(
              navButton,
              sidebarOpen && 'border-primary/30 bg-accent text-accent-foreground hover:bg-accent'
            )}
          >
            <Users className="h-4 w-4" />
          </button>
        )}

        <button onClick={() => onDateChange(subDays(selectedDate, 1))} aria-label="Jour précédent" className={navButton}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onDateChange(new Date())}
          className={cn(
            'h-10 px-4 rounded-xl border text-sm font-semibold transition-colors',
            isToday
              ? 'border-ink bg-ink text-white'
              : 'border-border bg-card text-foreground hover:bg-muted'
          )}
        >
          Aujourd'hui
        </button>
        <button onClick={() => onDateChange(addDays(selectedDate, 1))} aria-label="Jour suivant" className={navButton}>
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          onClick={onAddClick}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nouveau RDV</span>
        </button>
      </div>
    </div>
  );
};

export default AgendaHeader;
