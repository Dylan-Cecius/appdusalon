import type { Appointment } from '@/data/appointments';
import { getAppointmentState } from '@/lib/agendaSearch';
import { cn } from '@/lib/utils';

const tones = {
  muted: 'bg-slate-100 text-slate-600',
  danger: 'bg-rose-50 text-rose-700',
  success: 'bg-emerald-50 text-emerald-700',
  info: 'bg-violet-50 text-violet-700',
  warning: 'bg-amber-50 text-amber-800',
};

export default function AppointmentStatusBadge({ appointment }: { appointment: Appointment }) {
  const { label, tone } = getAppointmentState(appointment);
  return <span className={cn('inline-flex max-w-full rounded-full px-2 py-0.5 text-[10px] font-semibold', tones[tone])}>{label}</span>;
}
