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
  const isShort = heightPx < 44;

  const style: React.CSSProperties = isDragOverlay
    ? {
        width: 180,
        height: `${Math.max(heightPx, 24)}px`,
        backgroundColor: `${color}25`,
        border: `1.5px solid ${color}40`,
        opacity: 0.95,
      }
    : {
        top: `${topPx}px`,
        height: `${Math.max(heightPx, 24)}px`,
        backgroundColor: `${color}18`,
        border: `1.5px solid ${color}30`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.25 : 1,
      };

  const card = (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg cursor-grab overflow-hidden transition-all duration-150",
        !isDragOverlay && "absolute left-1.5 right-1.5",
        isDragOverlay && "shadow-xl ring-2 ring-primary/20",
        isDragging && "z-50",
        "hover:shadow-md hover:z-20",
        "active:cursor-grabbing"
      )}
      style={style}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
    >
      <div className={cn("px-2.5 h-full flex flex-col justify-center", isShort ? "py-0" : "py-2")}>
        {isShort ? (
          <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="font-semibold text-foreground truncate">{appointment.clientName}</span>
            <span className="text-muted-foreground shrink-0">{format(startTime, 'HH:mm')}</span>
          </div>
        ) : (
          <>
            <div className="text-[13px] font-semibold text-foreground truncate leading-tight">
              {appointment.clientName}
            </div>
            <div className="text-[11px] leading-tight mt-0.5 text-muted-foreground line-clamp-2 break-words">
              {serviceName}
            </div>
            {heightPx >= 60 && (
              <div className="text-[11px] text-muted-foreground leading-tight mt-1">
                {format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}
              </div>
            )}
            {!appointment.isPaid && heightPx >= 75 && (
              <div className="text-[10px] font-semibold text-destructive mt-1">Non payé</div>
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
          <div className="text-xs">{format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}</div>
          <div className="text-xs font-semibold">{appointment.totalPrice}€</div>
          {appointment.notes && <div className="text-xs italic">{appointment.notes}</div>}
          {!appointment.isPaid && <div className="text-xs font-bold text-destructive">Non payé</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

AppointmentCard.displayName = 'AppointmentCard';
export default AppointmentCard;
