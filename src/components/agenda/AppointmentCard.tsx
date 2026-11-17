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
  /** Teinte du service ; le fond pastel et le texte d'accent en sont dérivés. */
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
  // 2 px de respiration entre deux rendez-vous qui se suivent
  const cardHeight = Math.max(heightPx - 2, 18);
  const isTiny = cardHeight < 26;
  const isShort = cardHeight < 46;
  const isTall = cardHeight >= 72;

  const pastel = `color-mix(in srgb, ${color} 22%, white)`;
  const outline = `color-mix(in srgb, ${color} 45%, white)`;
  const accentText = `color-mix(in srgb, ${color} 62%, black)`;

  const style: React.CSSProperties = isDragOverlay
    ? { width: 220, height: `${Math.max(cardHeight, 44)}px`, opacity: 0.97 }
    : {
        top: `${topPx + 1}px`,
        height: `${cardHeight}px`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.25 : 1,
      };

  const unpaidDot = !appointment.isPaid && (
    <span className="w-2 h-2 rounded-full bg-destructive shrink-0" aria-label="Non payé" />
  );

  const card = (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab overflow-hidden text-foreground flex",
        isTiny ? "rounded-md" : "rounded-xl",
        "transition-shadow duration-150",
        !isDragOverlay && "absolute left-1.5 right-1.5",
        isDragOverlay && "shadow-xl",
        isDragging && "z-50",
        "hover:z-20 hover:shadow-md",
        "active:cursor-grabbing"
      )}
      style={{ ...style, backgroundColor: pastel, boxShadow: `inset 0 0 0 1px ${outline}` }}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Barre d'accent à la couleur du service */}
      <span className="w-1.5 shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />

      <div className={cn(
        "min-w-0 flex-1 h-full flex flex-col overflow-hidden",
        isTiny ? "px-2 justify-center" : isShort ? "px-2.5 justify-center" : "px-3 py-1.5 justify-start"
      )}>
        {isShort ? (
          <div className={cn("flex items-center gap-2 leading-none min-w-0", isTiny ? "text-[11px]" : "text-[13px]")}>
            <span className="font-bold shrink-0 tabular-nums" style={{ color: accentText }}>{format(startTime, 'HH:mm')}</span>
            <span className="font-semibold truncate min-w-0">{appointment.clientName}</span>
            {!isTiny && serviceName && (
              <span className="truncate min-w-0 flex-1 text-foreground/70">{serviceName}</span>
            )}
            {unpaidDot}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold truncate leading-tight min-w-0 flex-1">
                {appointment.clientName}
              </span>
              {!isTall && unpaidDot}
            </div>
            <div className="text-xs leading-snug truncate min-w-0">
              <span className="font-bold tabular-nums" style={{ color: accentText }}>
                {format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}
              </span>
              {serviceName && <span className="text-foreground/75"> · {serviceName}</span>}
            </div>
            {isTall && (
              <div className="flex items-center gap-2 mt-auto">
                <span className="text-xs font-semibold">{appointment.totalPrice} €</span>
                {!appointment.isPaid && (
                  <span className="text-[11px] font-semibold text-red-800 bg-white/70 px-2 py-0.5 rounded-full">
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
