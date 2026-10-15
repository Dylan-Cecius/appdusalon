import TransactionSyncNotice from '@/components/TransactionSyncNotice';
import { ClientEditError, saveClientEdit } from '@/lib/clientEditDraft';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarClock,
  Clock,
  DollarSign,
  Edit2,
  FileText,
  Gift,
  Mail,
  Phone,
  Save,
  Scissors,
  ShieldAlert,
  Trash2,
  TrendingUp,
  UserRound,
  UserX,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import type { Client, ClientStats } from '@/hooks/useClients';
import { useSupabaseTransactions } from '@/hooks/useSupabaseTransactions';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useActivityLog } from '@/hooks/useActivityLog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useSubscriptionRights } from '@/hooks/useSubscriptionRights';
import { useLoyalty } from '@/hooks/useLoyalty';

interface ClientDetailModalProps {
  client: Client;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Client>) => Promise<Client | null>;
  onUpdated: (client: Client) => void;
  getClientStats: (id: string) => Promise<ClientStats | null>;
  refreshClients: () => Promise<void>;
  clientsLoading: boolean;
}

const euro = (value: number) =>
  new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);

const ClientDetailModal = ({ client, open, onClose, onSave, onUpdated, getClientStats, refreshClients, clientsLoading: clientDataLoading }: ClientDetailModalProps) => {
  const { transactions, loading: transactionsLoading, error: transactionsError, refreshTransactions } = useSupabaseTransactions();
  const { appointments, loading: appointmentsLoading, error: appointmentsError, refreshAppointments } = useSupabaseAppointments();
  const revenueUnavailable = transactionsLoading || transactionsError;
  const appointmentsUnavailable = appointmentsLoading || appointmentsError;
  const { permissions } = usePermissions();
  const { toast } = useToast();
  const { rights } = useSubscriptionRights();
  const canUseClientNotes = rights.canAccessFullClientNotes;
  const {
    program: loyaltyProgram,
    account: loyaltyAccount,
    events: loyaltyEvents,
    loading: loyaltyLoading,
  } = useLoyalty(client.id);
  const { logActivity } = useActivityLog();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveLock = useRef(false);
  const saveErrorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (saveError) saveErrorRef.current?.focus(); }, [saveError]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsRefresh, setStatsRefresh] = useState(0);
  const [editedClient, setEditedClient] = useState(client);
  const [rgpdConfirmName, setRgpdConfirmName] = useState('');
  const [isRgpdDeleting, setIsRgpdDeleting] = useState(false);
  const [rgpdDialogOpen, setRgpdDialogOpen] = useState(false);

  useEffect(() => {
    if (!isEditing && !saving) setEditedClient(client);
  }, [client, isEditing, saving]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setStatsLoading(true); setStats(null);
    void getClientStats(client.id).then(result => {
      if (active) { setStats(result); setStatsLoading(false); }
    });
    return () => { active = false; };
  }, [open, client.id, getClientStats, statsRefresh]);

  useEffect(() => {
    if (!rgpdDialogOpen) setRgpdConfirmName('');
  }, [rgpdDialogOpen]);

  const clientTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.clientId === client.id),
    [transactions, client.id]
  );

  const clientAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.clientPhone === client.phone),
    [appointments, client.phone]
  );

  const insights = useMemo(() => {
    const now = Date.now();
    const paidRevenue = clientTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.totalAmount || 0),
      0
    );
    const averageBasket =
      clientTransactions.length > 0 ? paidRevenue / clientTransactions.length : 0;

    const upcoming = clientAppointments
      .filter(
        (appointment) =>
          ['scheduled', 'pending_payment'].includes(appointment.status) &&
          new Date(appointment.startTime).getTime() > now
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

    const noShows = clientAppointments.filter(
      (appointment) => appointment.status === 'no_show'
    ).length;
    const cancellations = clientAppointments.filter(
      (appointment) => appointment.status === 'cancelled'
    ).length;

    const serviceCounts = new Map<string, number>();
    clientAppointments
      .filter(
        (appointment) =>
          appointment.status !== 'cancelled' &&
          appointment.status !== 'no_show' &&
          new Date(appointment.startTime).getTime() <= now
      )
      .forEach((appointment) => {
        appointment.services.forEach((service) => {
          serviceCounts.set(
            service.name,
            (serviceCounts.get(service.name) || 0) + 1
          );
        });
      });

    const favoriteService =
      [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const paidVisitDates = clientTransactions
      .map((transaction) => new Date(transaction.transactionDate).getTime())
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    let averageVisitGapDays: number | null = null;
    if (paidVisitDates.length >= 2) {
      const gaps = paidVisitDates
        .slice(1)
        .map((date, index) => (date - paidVisitDates[index]) / 86_400_000);
      averageVisitGapDays =
        gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    }

    return {
      paidRevenue,
      averageBasket,
      upcoming: upcoming[0] || null,
      noShows,
      cancellations,
      favoriteService,
      averageVisitGapDays,
    };
  }, [clientTransactions, clientAppointments]);

  const allVisits = useMemo(
    () =>
      [
        ...clientTransactions.map((transaction) => ({
          id: transaction.id,
          date: new Date(transaction.transactionDate),
          type: 'transaction' as const,
          amount: transaction.totalAmount,
          items: transaction.items,
        })),
        ...clientAppointments.map((appointment) => ({
          id: appointment.id,
          date: new Date(appointment.startTime),
          type: 'appointment' as const,
          amount: appointment.totalPrice,
          services: appointment.services,
          status: appointment.status,
          isPaid: appointment.isPaid,
        })),
      ].sort((a, b) => b.date.getTime() - a.date.getTime()),
    [clientTransactions, clientAppointments]
  );

  const handleSave = async () => {
    if (saveLock.current) return;
    setSaving(true); setSaveError(null);
    try {
      await saveClientEdit(saveLock, {
        id: client.id, draft: editedClient, canUseNotes: canUseClientNotes, update: onSave,
        confirmed: updated => { onUpdated(updated); setEditedClient(updated); setIsEditing(false); },
      });
    } catch (error) {
      setSaveError(error instanceof ClientEditError ? error.message : 'Modification non confirmée. Vos saisies sont conservées ; vérifiez votre connexion puis réessayez.');
    } finally { setSaving(false); }
  };

  const handleRgpdDelete = async () => {
    setIsRgpdDeleting(true);
    try {
      const { error } = await supabase.rpc('erase_client_personal_data', {
        client_id_param: client.id,
      });
      if (error) throw error;

      await logActivity('CLIENT_DELETED', {
        erased_client_id: client.id,
        mode: 'rgpd_erasure',
      });
      await refreshClients();

      toast({
        title: 'Données personnelles effacées',
        description:
          'La fiche client a été supprimée. Les écritures comptables sont conservées sans lien vers le client.',
      });
      setRgpdDialogOpen(false);
      onClose();
    } catch (error) {
      console.error('RGPD client erasure failed:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d’effacer les données personnelles',
        variant: 'destructive',
      });
    } finally {
      setIsRgpdDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!next && !saveLock.current) onClose(); }}>
      <DialogContent aria-busy={saving} className="max-h-[92vh] max-w-5xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
                {client.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <DialogTitle className="truncate text-xl font-semibold tracking-tight text-slate-950">
                  {client.name}
                </DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {client.phone}
                  </span>
                  {client.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </span>
                  )}
                  <span>
                    Client depuis {format(new Date(client.created_at), 'MMM yyyy', { locale: fr })}
                  </span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" disabled={saving} onClick={() => { setSaveError(null); setIsEditing(false); }}>
                    <X className="mr-1 h-4 w-4" />
                    Annuler
                  </Button>
                  <Button size="sm" disabled={saving} onClick={handleSave}>
                    <Save className="mr-1 h-4 w-4" />
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-1 h-4 w-4" />
                  Modifier
                </Button>
              )}
            </div>
          </div>
          {saving && <p role="status" className="mt-2 text-sm text-muted-foreground">Enregistrement en cours…</p>}
          {saveError && <p role="alert" ref={saveErrorRef} tabIndex={-1} className="mt-2 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{saveError}</p>}
        </DialogHeader>

        <div className="bg-slate-50/70 p-4 sm:p-6">
          <TransactionSyncNotice error={transactionsError} loading={transactionsLoading} onRetry={() => void refreshTransactions()} />
          {appointmentsError && <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p>Historique des rendez-vous non actualisé.</p>
            <Button variant="outline" disabled={appointmentsLoading} className="mt-2 min-h-11" onClick={() => void refreshAppointments()}>Actualiser les rendez-vous</Button>
          </div>}
          {statsLoading || clientDataLoading ? <p role="status" className="mb-4 text-sm text-muted-foreground">Chargement des statistiques client…</p> : !stats && <div role="alert" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p>Les statistiques de visites sont indisponibles.</p>
            <Button variant="outline" className="mt-2 min-h-11" onClick={() => setStatsRefresh(value => value + 1)}>Réessayer les statistiques</Button>
          </div>}
          <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'CA généré',
                value: revenueUnavailable ? '—' : euro(insights.paidRevenue),
                icon: DollarSign,
                helper: revenueUnavailable ? 'historique non confirmé' : clientTransactions.length + ' encaissement' + (clientTransactions.length > 1 ? 's' : ''),
              },
              {
                label: 'Panier moyen',
                value: revenueUnavailable ? '—' : euro(insights.averageBasket),
                icon: TrendingUp,
                helper: 'sur les ventes enregistrées',
              },
              {
                label: 'Visites',
                value: stats ? String(stats.visitCount) : '—',
                icon: UserRound,
                helper:
                  insights.averageVisitGapDays !== null
                    ? 'tous les ' + Math.round(insights.averageVisitGapDays) + ' j. en moyenne'
                    : 'historique client',
              },
              {
                label: 'No-shows',
                value: appointmentsUnavailable ? '—' : String(insights.noShows),
                icon: UserX,
                helper:
                  appointmentsUnavailable ? 'historique non confirmé' : insights.cancellations > 0
                    ? insights.cancellations + ' annulation' + (insights.cancellations > 1 ? 's' : '')
                    : 'aucune annulation',
              },
            ].map(({ label, value, icon: Icon, helper }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    {label}
                  </span>
                  <Icon className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {value}
                </div>
                <div className="mt-1 truncate text-[11px] text-slate-400">{helper}</div>
              </div>
            ))}
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl border border-slate-200 bg-white p-1">
              <TabsTrigger value="overview">Vue client</TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
              <TabsTrigger value="info">Coordonnées</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              {loyaltyProgram?.enabled && (
                <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                        <Gift className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-violet-950">Fidélité</p>
                        <p className="text-xs text-violet-700/70">
                          {loyaltyLoading
                            ? 'Chargement…'
                            : `${loyaltyAccount?.points_balance || 0} points disponibles`}
                        </p>
                      </div>
                    </div>

                    {!loyaltyLoading && loyaltyProgram && (
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-semibold text-violet-950">
                          {loyaltyAccount?.points_balance || 0} / {loyaltyProgram.reward_threshold}
                        </p>
                        <p className="text-[11px] text-violet-700">
                          {Number(loyaltyAccount?.points_balance || 0) >= loyaltyProgram.reward_threshold
                            ? `${loyaltyProgram.reward_value.toFixed(2)} € de récompense disponible`
                            : `${Math.max(
                                loyaltyProgram.reward_threshold -
                                  Number(loyaltyAccount?.points_balance || 0),
                                0
                              )} points avant la prochaine récompense`}
                        </p>
                      </div>
                    )}
                  </div>

                  {!loyaltyLoading && loyaltyProgram && (
                    <>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80">
                        <div
                          className="h-full rounded-full bg-violet-600 transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (Number(loyaltyAccount?.points_balance || 0) /
                                Math.max(loyaltyProgram.reward_threshold, 1)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-violet-700/70">
                        <span>
                          Gagnés au total : {loyaltyAccount?.lifetime_earned || 0} pts
                        </span>
                        {loyaltyEvents[0] && (
                          <span>
                            Dernier mouvement :{' '}
                            {loyaltyEvents[0].points_delta > 0 ? '+' : ''}
                            {loyaltyEvents[0].points_delta} pts
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Prochain rendez-vous</h3>
                  </div>
                  {insights.upcoming ? (
                    <div className="mt-4">
                      <div className="text-xl font-semibold text-slate-950">
                        {format(new Date(insights.upcoming.startTime), 'EEEE d MMMM', {
                          locale: fr,
                        })}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {format(new Date(insights.upcoming.startTime), 'HH:mm')} ·{' '}
                        {insights.upcoming.services.map((service) => service.name).join(', ')}
                      </div>
                      <div className="mt-3 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                        {insights.upcoming.status === 'pending_payment'
                          ? 'PAIEMENT EN ATTENTE'
                          : 'CONFIRMÉ'}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-center">
                      <p className="text-sm font-medium text-slate-700">Aucun prochain RDV</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Ce client peut être intéressant à relancer.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Habitudes</h3>
                  </div>
                  <dl className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-sm text-slate-500">Prestation favorite</dt>
                      <dd className="text-sm font-semibold text-slate-900">
                        {insights.favoriteService || 'Pas assez de données'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-sm text-slate-500">Dernière visite</dt>
                      <dd className="text-sm font-semibold text-slate-900">
                        {!stats ? '—' : stats.lastVisit
                          ? format(new Date(stats.lastVisit), 'd MMM yyyy', { locale: fr })
                          : 'Jamais'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-sm text-slate-500">Fréquence moyenne</dt>
                      <dd className="text-sm font-semibold text-slate-900">
                        {insights.averageVisitGapDays !== null
                          ? Math.round(insights.averageVisitGapDays) + ' jours'
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {canUseClientNotes && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <h3 className="text-sm font-semibold">Notes client</h3>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {client.notes || 'Aucune note enregistrée.'}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {allVisits.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Aucun historique de visite
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {allVisits.map((visit) => (
                      <div
                        key={`${visit.type}-${visit.id}`}
                        className="flex gap-4 px-4 py-3.5"
                      >
                        <span
                          className={
                            visit.type === 'transaction'
                              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700'
                              : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700'
                          }
                        >
                          {visit.type === 'transaction' ? (
                            <DollarSign className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {visit.type === 'transaction' ? 'Encaissement' : 'Rendez-vous'}
                            </p>
                            <span className="text-xs font-semibold text-slate-700">
                              {euro(Number(visit.amount || 0))}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {format(visit.date, 'EEEE d MMMM yyyy · HH:mm', { locale: fr })}
                          </p>
                          <div className="mt-1.5 truncate text-xs text-slate-500">
                            {visit.type === 'transaction'
                              ? visit.items.map((item: any) => item.name).join(', ')
                              : visit.services.map((service: any) => service.name).join(', ')}
                          </div>
                          {visit.type === 'appointment' && (
                            <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                              {visit.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="info" className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-client-name">Nom complet</Label>
                    <Input id="edit-client-name"
                      autoComplete="name"
                      value={editedClient.name}
                      onChange={(event) =>
                        setEditedClient({ ...editedClient, name: event.target.value })
                      }
                      disabled={!isEditing || saving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-client-phone">Téléphone</Label>
                    <Input id="edit-client-phone"
                      type="tel" autoComplete="tel"
                      value={editedClient.phone}
                      onChange={(event) =>
                        setEditedClient({ ...editedClient, phone: event.target.value })
                      }
                      disabled={!isEditing || saving}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="edit-client-email">Email</Label>
                    <Input id="edit-client-email"
                      type="email"
                      value={editedClient.email || ''}
                      onChange={(event) =>
                        setEditedClient({ ...editedClient, email: event.target.value })
                      }
                      disabled={!isEditing || saving}
                    />
                  </div>
                  {canUseClientNotes ? (
                    <div className="sm:col-span-2">
                      <Label htmlFor="edit-client-notes">Notes</Label>
                      <Textarea id="edit-client-notes"
                        value={editedClient.notes || ''}
                        onChange={(event) =>
                          setEditedClient({ ...editedClient, notes: event.target.value })
                        }
                        disabled={!isEditing || saving}
                        rows={5}
                        placeholder="Préférences, allergies, remarques..."
                      />
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground sm:col-span-2">
                      Les notes client complètes sont disponibles à partir du plan Solo.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {permissions.isAdmin && (
            <>
              <Separator className="my-5" />
              <div className="space-y-3 rounded-2xl border border-destructive/20 bg-white p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                  <span className="text-sm font-semibold">
                    Droit à l'oubli — RGPD Article 17
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Effacement définitif des données personnelles. Les écritures comptables
                  restent conservées mais dissociées du client.
                </p>

                <AlertDialog open={rgpdDialogOpen} onOpenChange={setRgpdDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={saving}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer définitivement ce client
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <ShieldAlert className="h-5 w-5" />
                        Suppression RGPD irréversible
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <span className="block">
                          Cette action est irréversible. La fiche de{' '}
                          <strong>{client.name}</strong>, les coordonnées présentes dans les
                          rendez-vous et les journaux SMS seront effacés. Les transactions
                          financières resteront conservées mais ne seront plus liées au client.
                        </span>
                        <span className="block text-sm">
                          Pour confirmer, tapez <strong>{client.name}</strong> ci-dessous :
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input
                      placeholder={client.name}
                      value={rgpdConfirmName}
                      onChange={(event) => setRgpdConfirmName(event.target.value)}
                      className="mt-2"
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isRgpdDeleting}>
                        Annuler
                      </AlertDialogCancel>
                      <Button
                        variant="destructive"
                        disabled={
                          rgpdConfirmName !== client.name || isRgpdDeleting
                        }
                        onClick={handleRgpdDelete}
                      >
                        {isRgpdDeleting
                          ? 'Suppression...'
                          : 'Supprimer définitivement'}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailModal;
