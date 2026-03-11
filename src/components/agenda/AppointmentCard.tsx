import { memo } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
  isDragOverlay?: boolean;
}

const AppointmentCard = memo(({ appointment, slotHeight, startHour, color, onClick, isDragOverlay }: AppointmentCardProps) => {
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);
  const startMinutes = (startTime.getHours() - startHour) * 60 + startTime.getMinutes();
  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  const topPx = (startMinutes / 15) * slotHeight;
  const heightPx = (durationMinutes / 15) * slotHeight;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
    disabled: isDragOverlay,
  });

  const serviceName = appointment.services?.[0]?.name || '';
  const isShort = heightPx < 40;

  const style: React.CSSProperties = isDragOverlay
    ? {
        width: 160,
        height: `${Math.max(heightPx, 20)}px`,
        backgroundColor: `${color}30`,
        borderLeft: `3px solid ${color}`,
        opacity: 0.95,
      }
    : {
        top: `${topPx}px`,
        height: `${Math.max(heightPx, 20)}px`,
        backgroundColor: `${color}20`,
        borderLeft: `3px solid ${color}`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : 1,
      };

  const card = (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg cursor-grab overflow-hidden transition-shadow duration-150",
        "shadow-sm border border-black/5",
        !isDragOverlay && "absolute left-1 right-1",
        isDragOverlay && "shadow-xl ring-2 ring-primary/30",
        isDragging && "z-50",
        !appointment.isPaid && "ring-1 ring-orange-400/50",
        "hover:shadow-lg hover:z-20",
        "active:cursor-grabbing"
      )}
      style={style}
      onClick={(e) => {
        if (isDragging) return;
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
  );

  if (isDragOverlay) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
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
