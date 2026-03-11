import { memo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AppointmentCardProps {
  appointment: any;
  slotHeight: number;
  startHour: number;
  color: string;
  onClick: () => void;
}

const AppointmentCard = memo(({ appointment, slotHeight, startHour, color, onClick }: AppointmentCardProps) => {
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);
  const startMinutes = (startTime.getHours() - startHour) * 60 + startTime.getMinutes();
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  const topPx = (startMinutes / 15) * slotHeight;
  const heightPx = (durationMinutes / 15) * slotHeight;

  const serviceName = appointment.services?.[0]?.name || '';
  const isShort = heightPx < 40;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "absolute left-1 right-1 rounded-lg cursor-pointer overflow-hidden transition-all duration-150",
            "hover:shadow-lg hover:scale-[1.02] hover:z-20",
            "shadow-sm border border-black/5",
            !appointment.isPaid && "ring-1 ring-orange-400/50"
          )}
          style={{
            top: `${topPx}px`,
            height: `${Math.max(heightPx, 20)}px`,
            backgroundColor: `${color}20`,
            borderLeft: `3px solid ${color}`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <div className={cn("px-2 h-full flex flex-col justify-center", isShort ? "py-0" : "py-1.5")}>
            {isShort ? (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-foreground truncate">
                <span>{format(startTime, 'HH:mm')}</span>
                <span className="truncate">{appointment.clientName}</span>
              </div>
            ) : (
              <>
                <div className="text-xs font-bold text-foreground truncate leading-tight">
                  {appointment.clientName}
                </div>
                <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5" style={{ color }}>
                  {serviceName}
                </div>
                {heightPx >= 55 && (
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                  </div>
                )}
                {!appointment.isPaid && heightPx >= 70 && (
                  <div className="text-[9px] font-bold text-orange-500 mt-0.5">NON PAYÉ</div>
                )}
              </>
            )}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[220px]">
        <div className="space-y-1">
          <div className="font-bold">{appointment.clientName}</div>
          <div className="text-xs text-muted-foreground">{serviceName}</div>
          <div className="text-xs">{format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}</div>
          <div className="text-xs font-semibold">{appointment.totalPrice}€</div>
          {appointment.notes && <div className="text-xs italic">{appointment.notes}</div>}
          {!appointment.isPaid && <div className="text-xs font-bold text-orange-500">Non payé</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

AppointmentCard.displayName = 'AppointmentCard';
export default AppointmentCard;
