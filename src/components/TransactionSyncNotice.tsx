import { Button } from '@/components/ui/button';

export default function TransactionSyncNotice({ error, loading, onRetry }: {
  error: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  if (!error) return null;
  return <div role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
    <p className="font-semibold">Historique des encaissements non actualisé</p>
    <p className="mt-1">Les montants affichés peuvent être incomplets. Actualisez l’historique avant de réessayer un encaissement dont la confirmation est incertaine.</p>
    <Button type="button" variant="outline" className="mt-3 min-h-11" disabled={loading} onClick={onRetry}>
      {loading ? 'Actualisation…' : 'Actualiser l’historique'}
    </Button>
  </div>;
}
