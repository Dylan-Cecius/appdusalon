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
  const cardHeight = Math.max(heightPx, 44);
  const isShort = cardHeight < 56;
  const isTall = cardHeight >= 75;

  const style: React.CSSProperties = isDragOverlay
    ? {
        width: 220,
        minHeight: '44px',
        height: `${cardHeight}px`,
        opacity: 0.97,
      }
    : {
        top: `${topPx}px`,
        minHeight: '44px',
        height: `${cardHeight}px`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.25 : 1,
      };

  const card = (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-xl cursor-grab overflow-hidden text-foreground",
        "transition-shadow duration-150",
        !isDragOverlay && "absolute left-1.5 right-1.5",
        isDragOverlay && "shadow-xl",
        isDragging && "z-50",
        "hover:z-20 hover:shadow-md",
        "active:cursor-grabbing"
      )}
      style={{
        ...style,
        // Teinte claire de la couleur du coiffeur / service, lisible avec du texte foncé
        backgroundColor: `color-mix(in srgb, ${color} 16%, white)`,
        borderLeft: `4px solid ${color}`,
      }}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
    >
      <div className={cn(
        "px-3 h-full flex flex-col overflow-hidden",
        isShort ? "justify-center py-1" : "justify-start py-2"
      )}>
        {isShort ? (
          <div className="flex items-center gap-2 text-[13px] leading-normal min-w-0">
            <span className="font-semibold shrink-0 tabular-nums">{format(startTime, 'HH:mm')}</span>
            <span className="font-medium truncate flex-1 min-w-0">{appointment.clientName}</span>
            {!appointment.isPaid && (
              <span className="w-2 h-2 rounded-full bg-destructive shrink-0" aria-label="Non payé" />
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold truncate leading-normal min-w-0 flex-1">
                {appointment.clientName}
              </span>
              {!appointment.isPaid && !isTall && (
                <span className="w-2 h-2 rounded-full bg-destructive shrink-0" aria-label="Non payé" />
              )}
            </div>
            <div className="text-xs leading-normal text-foreground/75 truncate min-w-0">
              {serviceName}
            </div>
            {heightPx >= 60 && (
              <div className="text-xs text-foreground/75 leading-snug mt-0.5 tabular-nums">
                {format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}
              </div>
            )}
            {isTall && (
              <div className="flex items-center gap-2 mt-auto pt-1">
                <span className="text-xs font-semibold">{appointment.totalPrice} €</span>
                {!appointment.isPaid && (
                  <span className="text-[11px] font-semibold text-red-800 bg-red-100 px-2 py-0.5 rounded-full">
                    Non payé
                  </span>
                )}
              </div>
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
      <TooltipContent side="right" className="max-w-[240px] bg-ink text-white border-ink">
        <div className="space-y-1">
          <div className="font-semibold">{appointment.clientName}</div>
          <div className="text-xs text-white/80">{serviceName}</div>
          <div className="text-xs text-white/80 tabular-nums">{format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}</div>
          <div className="text-xs font-semibold">{appointment.totalPrice} €</div>
          {appointment.notes && <div className="text-xs italic text-white/70">{appointment.notes}</div>}
          {!appointment.isPaid && <div className="text-xs font-semibold text-gold">Non payé</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

AppointmentCard.displayName = 'AppointmentCard';
export default AppointmentCard;
