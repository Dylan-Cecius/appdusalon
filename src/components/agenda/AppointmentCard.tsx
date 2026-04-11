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
        opacity: 0.95,
      }
    : {
        top: `${topPx}px`,
        minHeight: '44px',
        height: `${cardHeight}px`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.2 : 1,
      };

  const card = (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg cursor-grab overflow-hidden group",
        "transition-all duration-200 ease-out",
        !isDragOverlay && "absolute left-1 right-1",
        isDragOverlay && "shadow-2xl ring-1 ring-white/10",
        isDragging && "z-50",
        "hover:z-20 hover:shadow-lg",
        "active:cursor-grabbing"
      )}
      style={{
        ...style,
        background: `linear-gradient(135deg, ${color}18 0%, ${color}10 100%)`,
        borderLeft: `3px solid ${color}`,
        backdropFilter: 'blur(8px)',
        border: `1px solid ${color}25`,
        borderLeftWidth: '3px',
        borderLeftColor: color,
      }}
      onClick={(e) => {
        if (isDragging) return;
        e.stopPropagation();
        onClick();
      }}
    >
      <div className={cn(
        "px-2.5 h-full flex flex-col overflow-hidden",
        isShort ? "justify-center py-1" : "justify-start py-2"
      )}>
        {isShort ? (
          <div className="flex items-center gap-1.5 text-[11px] leading-normal font-medium min-w-0">
            <span className="font-semibold text-white truncate flex-1 min-w-0">{appointment.clientName}</span>
            <span className="text-white/35 shrink-0 text-[10px] font-mono">{format(startTime, 'HH:mm')}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[13px] font-semibold text-white truncate leading-normal min-w-0 flex-1">
                {appointment.clientName}
              </span>
              {!appointment.isPaid && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 animate-pulse" />
              )}
            </div>
            <div className="text-[11px] leading-normal mt-0.5 text-white/45 truncate min-w-0">
              {serviceName}
            </div>
            {heightPx >= 60 && (
              <div className="text-[10px] text-white/30 leading-snug mt-1 font-mono tracking-wide">
                {format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}
              </div>
            )}
            {isTall && (
              <div className="flex items-center gap-1.5 mt-auto pt-1">
                <span className="text-[11px] font-semibold text-white/60">{appointment.totalPrice}€</span>
                {!appointment.isPaid && (
                  <span className="text-[9px] font-medium text-red-400/80 bg-red-400/10 px-1.5 py-0.5 rounded-full">
                    Non payé
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Hover glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${color}10 0%, transparent 60%)`,
        }}
      />
    </div>
  );

  if (isDragOverlay) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent
        side="right"
        className="max-w-[220px] border-white/10"
        style={{ backgroundColor: '#1e1e35', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <div className="space-y-1.5">
          <div className="font-bold text-white">{appointment.clientName}</div>
          <div className="text-xs text-white/50">{serviceName}</div>
          <div className="text-xs text-white/70 font-mono">{format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}</div>
          <div className="text-xs font-semibold text-white/80">{appointment.totalPrice}€</div>
          {appointment.notes && <div className="text-xs italic text-white/40">{appointment.notes}</div>}
          {!appointment.isPaid && <div className="text-xs font-bold text-red-400">Non payé</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

AppointmentCard.displayName = 'AppointmentCard';
export default AppointmentCard;
