import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Calendar, Users } from 'lucide-react';
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

const AgendaHeader = ({ selectedDate, onDateChange, onAddClick, onToggleSidebar, sidebarOpen, appointmentCount = 0 }: AgendaHeaderProps) => {
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 shrink-0"
      style={{
        background: 'linear-gradient(180deg, #16162a 0%, #12121f 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Left: Sidebar toggle + Navigation */}
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200",
              sidebarOpen
                ? "bg-indigo-500/15 text-indigo-400"
                : "text-white/40 hover:text-white/60 hover:bg-white/5"
            )}
          >
            <Users className="h-4 w-4" />
          </button>
        )}

        <div className="flex items-center bg-white/[0.04] rounded-lg p-0.5">
          <button
            onClick={() => onDateChange(subDays(selectedDate, 1))}
            className="h-7 w-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-150"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => onDateChange(new Date())}
            className={cn(
              "h-7 px-3 text-xs font-medium rounded-md transition-all duration-200",
              isToday
                ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/25"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            Aujourd'hui
          </button>

          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            className="h-7 w-7 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all duration-150"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Date display with picker */}
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.04] transition-all duration-200 group">
              <Calendar className="h-4 w-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              <span className="text-white font-semibold text-sm sm:text-base capitalize tracking-tight">
                {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
              </span>
              <ChevronRight className="h-3 w-3 text-white/20 rotate-90 group-hover:text-white/40 transition-colors" />
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

        {appointmentCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[11px] font-medium text-indigo-300">{appointmentCount} RDV</span>
          </div>
        )}
      </div>

      {/* Right: Add button */}
      <button
        onClick={onAddClick}
        className="h-9 px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
          color: 'white',
        }}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Nouveau RDV</span>
      </button>
    </div>
  );
};

export default AgendaHeader;
