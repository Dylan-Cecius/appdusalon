import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';

interface AgendaHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onAddClick: () => void;
}

const AgendaHeader = ({ selectedDate, onDateChange, onAddClick }: AgendaHeaderProps) => {
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div
      className="flex items-center justify-between gap-3 px-5 py-3 border-b shrink-0"
      style={{ backgroundColor: '#0f0f1a', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      {/* Left: Navigation */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onDateChange(subDays(selectedDate, 1))}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={() => onDateChange(new Date())}
          className={cn(
            "h-7 px-3 text-xs font-medium rounded-lg transition-colors",
            isToday
              ? "bg-indigo-500 text-white"
              : "text-white/60 hover:text-white hover:bg-white/10"
          )}
        >
          Aujourd'hui
        </button>

        <button
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Center: Date display with picker */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span className="text-white font-semibold text-base capitalize tracking-tight">
              {format(selectedDate, 'EEEE, d MMMM', { locale: fr })}
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-white/30 rotate-90" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <CalendarPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateChange(date)}
            locale={fr}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Right: Add button */}
      <button
        onClick={onAddClick}
        className="h-9 px-4 rounded-lg font-medium text-sm flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white transition-colors shadow-lg shadow-indigo-500/20"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Nouveau RDV</span>
      </button>
    </div>
  );
};

export default AgendaHeader;
