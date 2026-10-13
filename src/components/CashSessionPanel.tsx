import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Banknote, CircleDollarSign, Minus, Plus, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCashSession } from '@/hooks/useCashSession';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';

type Mode = 'open' | 'deposit' | 'withdrawal' | 'close' | null;

const CashSessionPanel = () => {
  const { permissions } = usePermissions();
  const {
    session,
    movementTotals,
    loading,
    openSession,
    recordMovement,
    closeSession,
  } = useCashSession();

  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setMode(null);
    setAmount('');
    setReason('');
  };

  const submit = async () => {
    const parsed = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed < 0 || (mode !== 'open' && parsed <= 0)) {
      toast({
        title: 'Montant invalide',
        description: 'Indiquez un montant valide.',
        variant: 'destructive',
      });
      return;
    }

    setBusy(true);
    try {
      if (mode === 'open') {
        await openSession(parsed, reason);
      } else if (mode === 'deposit' || mode === 'withdrawal') {
        await recordMovement(mode, parsed, reason);
      } else if (mode === 'close') {
        await closeSession(parsed, reason);
      }
      reset();
    } catch (error) {
      console.error('[CashSessionPanel]', error);
      toast({
        title: 'Opération impossible',
        description: 'La caisse n’a pas pu être mise à jour.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-3 h-12 animate-pulse rounded-xl border border-slate-200 bg-white" />
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={
              session
                ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700'
                : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500'
            }
          >
            <WalletCards className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {session ? 'Session de caisse ouverte' : 'Caisse fermée'}
              </p>
              {session && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  OUVERTE
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-slate-500">
              {session
                ? `Ouverte à ${format(new Date(session.opened_at), 'HH:mm', { locale: fr })} · Fond ${Number(session.opening_float || 0).toFixed(2)} € · Mouvements ${movementTotals.net >= 0 ? '+' : ''}${movementTotals.net.toFixed(2)} €`
                : permissions.isAdmin
                  ? 'Ouvrez une session avant le premier encaissement espèces.'
                  : 'Un administrateur doit ouvrir la session de caisse.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {!session && permissions.isAdmin && (
            <Button size="sm" onClick={() => setMode('open')} className="h-8 rounded-lg">
              <Banknote className="mr-1.5 h-3.5 w-3.5" />
              Ouvrir
            </Button>
          )}

          {session && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode('deposit')}
                className="h-8 rounded-lg"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Dépôt
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode('withdrawal')}
                className="h-8 rounded-lg"
              >
                <Minus className="mr-1 h-3.5 w-3.5" />
                Retrait
              </Button>
              {permissions.isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMode('close')}
                  className="h-8 rounded-lg border-slate-300"
                >
                  <CircleDollarSign className="mr-1.5 h-3.5 w-3.5" />
                  Clôturer
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={mode !== null} onOpenChange={(open) => !open && reset()}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {mode === 'open' && 'Ouvrir la caisse'}
              {mode === 'deposit' && 'Ajouter un dépôt'}
              {mode === 'withdrawal' && 'Enregistrer un retrait'}
              {mode === 'close' && 'Clôturer la caisse'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="cash-session-amount">
                {mode === 'open'
                  ? 'Fond de caisse (€)'
                  : mode === 'close'
                    ? 'Espèces réellement comptées (€)'
                    : 'Montant (€)'}
              </Label>
              <Input
                id="cash-session-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={mode === 'close' ? 'Ex. 245.50' : 'Ex. 50.00'}
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="cash-session-reason">
                {mode === 'close' ? 'Note de clôture' : 'Motif / note'}
              </Label>
              <Input
                id="cash-session-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={
                  mode === 'withdrawal'
                    ? 'Ex. achat fournitures'
                    : mode === 'deposit'
                      ? 'Ex. ajout de monnaie'
                      : 'Facultatif'
                }
                maxLength={250}
              />
            </div>

            {mode === 'close' && session && (
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                Fond initial : <strong>{Number(session.opening_float).toFixed(2)} €</strong>
                <br />
                Dépôts : <strong>+{movementTotals.deposits.toFixed(2)} €</strong>
                <br />
                Retraits : <strong>−{movementTotals.withdrawals.toFixed(2)} €</strong>
                <br />
                Le total théorique incluant les ventes espèces sera calculé par le serveur.
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={reset} className="flex-1">
                Annuler
              </Button>
              <Button type="button" onClick={submit} disabled={busy || !amount} className="flex-1">
                {busy ? 'Traitement…' : 'Valider'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CashSessionPanel;
