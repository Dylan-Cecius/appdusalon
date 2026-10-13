import { memo } from 'react';
import { Repeat2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Appointment } from '@/data/appointments';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AppointmentCardProps {
  appointment: Appointment;
  slotHeight: number;
  startHour: number;
  color: string;
  onClick: () => void;
  minutesPerSlot?: number;
  isDragOverlay?: boolean;
}

const AppointmentCard = memo(({
  appointment,
  slotHeight,
  startHour,
  color,
  onClick,
  minutesPerSlot = 15,
  isDragOverlay,
}: AppointmentCardProps) => {
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);
  const startMinutes = (startTime.getHours() - startHour) * 60 + startTime.getMinutes();
  const durationMinutes = Math.max(
    minutesPerSlot,
    (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  );

  const topPx = (startMinutes / minutesPerSlot) * slotHeight;
  const heightPx = (durationMinutes / minutesPerSlot) * slotHeight;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
    disabled: isDragOverlay,
  });

  const serviceName = appointment.services?.[0]?.name || 'Rendez-vous';
  const cardHeight = Math.max(heightPx, 38);
  const isCompact = cardHeight < 56;
  const isTall = cardHeight >= 74;

  const style: React.CSSProperties = isDragOverlay
    ? {
        width: 230,
        minHeight: '42px',
        height: `${cardHeight}px`,
        opacity: 0.98,
      }
    : {
        top: `${topPx + 2}px`,
        minHeight: '38px',
        height: `${Math.max(cardHeight - 4, 38)}px`,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.28 : 1,
      };

  const card = (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'group overflow-hidden rounded-lg cursor-grab',
        'transition-[box-shadow,transform,opacity] duration-150 ease-out',
        !isDragOverlay && 'absolute left-1 right-1',
        isDragOverlay && 'shadow-2xl ring-1 ring-black/10',
        isDragging && 'z-50',
        'hover:z-20 hover:shadow-md',
        'active:cursor-grabbing'
      )}
      style={{
        ...style,
        backgroundColor: `${color}14`,
        border: `1px solid ${color}30`,
        borderLeft: `4px solid ${color}`,
      }}
      onClick={(event) => {
        if (isDragging) return;
        event.stopPropagation();
        onClick();
      }}
    >
      <div className={cn(
        'flex h-full min-w-0 flex-col overflow-hidden px-2.5',
        isCompact ? 'justify-center py-1' : 'justify-start py-2'
      )}>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-[12px] font-bold leading-tight text-foreground">
            {appointment.clientName}
          </span>
          {appointment.recurrenceGroupId && (
            <Repeat2 className="h-3 w-3 shrink-0 text-primary/70" />
          )}
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-muted-foreground">
            {format(startTime, 'HH:mm')}
          </span>
        </div>

        {!isCompact && (
          <div className="mt-0.5 truncate text-[10px] font-medium leading-tight text-muted-foreground">
            {serviceName}
          </div>
        )}

        {isTall && (
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] font-semibold text-foreground/75">
              {Number(appointment.totalPrice || 0).toFixed(2)} €
            </span>
            <AppointmentStatusBadge appointment={appointment} />
          </div>
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ boxShadow: `inset 0 0 0 1px ${color}35` }}
      />
    </div>
  );

  if (isDragOverlay) return card;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-[250px] p-3">
        <div className="space-y-1.5">
          <div className="font-semibold">{appointment.clientName}</div>
          <div className="text-xs text-muted-foreground">{serviceName}</div>
          <div className="text-xs font-medium tabular-nums">
            {format(startTime, 'HH:mm')} – {format(endTime, 'HH:mm')}
          </div>
          <div className="text-xs font-semibold">{Number(appointment.totalPrice || 0).toFixed(2)} €</div>
          <AppointmentStatusBadge appointment={appointment} />
          {appointment.recurrenceGroupId && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-primary">
              <Repeat2 className="h-3 w-3" />
              Série {Number(appointment.recurrenceIndex || 0) + 1}/{appointment.recurrenceTotal || '?'}
            </div>
          )}
          {appointment.notes && (
            <div className="max-w-[220px] text-xs italic text-muted-foreground">{appointment.notes}</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

AppointmentCard.displayName = 'AppointmentCard';
export default AppointmentCard;
