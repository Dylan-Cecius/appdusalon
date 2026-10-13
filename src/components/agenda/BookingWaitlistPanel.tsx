import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BellRing, Clock3, Phone, Scissors, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { BookingWaitlistEntry } from '@/hooks/useBookingWaitlist';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: BookingWaitlistEntry[];
  loading: boolean;
  onCancel: (id: string) => Promise<void>;
};

const BookingWaitlistPanel = ({
  open,
  onOpenChange,
  entries,
  loading,
  onCancel,
}: Props) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92vw] p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Liste d’attente
          </SheetTitle>
        </SheetHeader>

        <div className="h-[calc(100vh-72px)] overflow-y-auto bg-slate-50 p-3">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-2xl border bg-white" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed bg-white p-6 text-center">
              <BellRing className="h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-900">Aucune demande en attente</p>
              <p className="mt-1 text-xs text-slate-500">
                Les clients sans créneau disponible apparaîtront automatiquement ici.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const fromDate = new Date(entry.preferred_date_from + 'T12:00:00');
                const toDate = new Date(entry.preferred_date_to + 'T12:00:00');
                const sameDate = entry.preferred_date_from === entry.preferred_date_to;

                return (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-950">{entry.client_name}</p>
                          <span
                            className={
                              entry.status === 'notified'
                                ? 'rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700'
                                : 'rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700'
                            }
                          >
                            {entry.status === 'notified' ? 'SMS ENVOYÉ' : 'ACTIVE'}
                          </span>
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="h-3 w-3" />
                          {entry.client_phone}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:text-destructive"
                        onClick={() => void onCancel(entry.id)}
                        title="Retirer de la liste"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium text-slate-700">
                          {entry.service?.name || 'Prestation'}
                        </span>
                      </div>
                      {entry.preferred_staff?.name && (
                        <div className="flex items-center gap-2">
                          <UserRound className="h-3.5 w-3.5 text-slate-400" />
                          <span>{entry.preferred_staff.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {sameDate
                            ? format(fromDate, 'd MMM yyyy', { locale: fr })
                            : format(fromDate, 'd MMM', { locale: fr }) +
                              ' → ' +
                              format(toDate, 'd MMM yyyy', { locale: fr })}
                          {entry.preferred_time_start &&
                            ' · ' +
                              entry.preferred_time_start.slice(0, 5) +
                              (entry.preferred_time_end
                                ? '–' + entry.preferred_time_end.slice(0, 5)
                                : '')}
                        </span>
                      </div>
                    </div>

                    {entry.notification_count > 0 && (
                      <p className="mt-2 text-[10px] text-slate-400">
                        {entry.notification_count} notification{entry.notification_count > 1 ? 's' : ''} envoyée
                        {entry.notification_count > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BookingWaitlistPanel;
