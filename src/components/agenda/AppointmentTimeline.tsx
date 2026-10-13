import { format } from 'date-fns';
import type { Appointment } from '@/data/appointments';
import { getAppointmentSegments } from '@/lib/appointmentSegments';

export default function AppointmentTimeline({ appointment, compact = false }: { appointment: Appointment; compact?: boolean }) {
  const segments = getAppointmentSegments(appointment);
  if (segments.length < 2) return null;
  const freeMinutes = segments.filter(segment => !segment.occupiesStaff)
    .reduce((total, segment) => total + (segment.endTime.getTime() - segment.startTime.getTime()) / 60_000, 0);
  if (compact) return <span className="mt-1 block text-[10px] font-medium text-muted-foreground">{segments.length} étapes{freeMinutes > 0 && ` · pose libre ${freeMinutes} min`}</span>;
  return <section aria-label="Déroulé du rendez-vous" className="space-y-2">
    <p className="text-xs font-semibold">Déroulé du rendez-vous</p>
    <ol className="space-y-1.5">
      {segments.map((segment, index) => <li key={`${segment.id}-${index}`} className={`rounded-lg border px-3 py-2 text-xs ${!segment.occupiesStaff ? 'border-dashed border-amber-200 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
        <div className="flex flex-wrap items-center justify-between gap-1"><span className="font-medium">{segment.label}</span><span className="tabular-nums">{format(segment.startTime, 'HH:mm')}–{format(segment.endTime, 'HH:mm')}</span></div>
        <p className="mt-0.5 text-[10px]">{!segment.occupiesStaff ? 'Temps de pose · collaborateur disponible' : segment.type === 'cleanup' ? 'Préparation / nettoyage · collaborateur occupé' : 'Collaborateur occupé'}</p>
      </li>)}
    </ol>
  </section>;
}
