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
    <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-border/30 bg-background">
      {/* Left: Navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(subDays(selectedDate, 1))}
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant={isToday ? 'default' : 'outline'}
          onClick={() => onDateChange(new Date())}
          className={cn(
            "h-7 px-3 text-xs font-medium rounded-full",
            isToday && "bg-primary text-primary-foreground"
          )}
        >
          Aujourd'hui
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Center: Date display with picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-8 gap-2 text-sm font-semibold hover:bg-muted/50">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">
              {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <CalendarPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateChange(date)}
            locale={fr}
          />
        </PopoverContent>
      </Popover>

      {/* Right: Add button */}
      <Button
        onClick={onAddClick}
        size="sm"
        variant="outline"
        className="h-8 rounded-full font-medium gap-1.5 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Nouveau RDV</span>
      </Button>
    </div>
  );
};

export default AgendaHeader;
