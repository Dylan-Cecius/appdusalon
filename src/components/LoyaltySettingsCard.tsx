import { useEffect, useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoyalty } from '@/hooks/useLoyalty';

const LoyaltySettingsCard = () => {
  const { program, loading, error, refresh, saveProgram } = useLoyalty();
  const [enabled, setEnabled] = useState(false);
  const [pointsPerEuro, setPointsPerEuro] = useState('1');
  const [rewardThreshold, setRewardThreshold] = useState('200');
  const [rewardValue, setRewardValue] = useState('5');
  const [birthdayBonus, setBirthdayBonus] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!program) return;
    setEnabled(program.enabled);
    setPointsPerEuro(String(program.points_per_euro));
    setRewardThreshold(String(program.reward_threshold));
    setRewardValue(String(program.reward_value));
    setBirthdayBonus(String(program.birthday_bonus));
  }, [program]);

  const handleSave = async () => {
    if (!program) return;

    setSaving(true);
    try {
      await saveProgram({
        enabled,
        points_per_euro: Math.max(0, Number(pointsPerEuro) || 0),
        reward_threshold: Math.max(1, Math.round(Number(rewardThreshold) || 1)),
        reward_value: Math.max(0, Number(rewardValue) || 0),
        birthday_bonus: Math.max(0, Math.round(Number(birthdayBonus) || 0)),
      });
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Card className="p-4"><p role="alert">{error}</p><Button variant="outline" onClick={() => void refresh()}>Réessayer la fidélité</Button></Card>;
  if (!loading && !program) return <p role="status">Sélectionnez un salon pour consulter la fidélité.</p>;
  if (loading || !program) {
    return <div className="h-52 animate-pulse rounded-2xl border bg-white" />;
  }

  return (
    <Card className="v2-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Programme fidélité</h3>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
              Les points sont ajoutés automatiquement aux clients lors des encaissements et retirés si une vente est annulée.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEnabled((value) => !value)}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <span className="text-xs font-semibold text-slate-600">
            {enabled ? 'Activé' : 'Désactivé'}
          </span>
          <span
            className={
              enabled
                ? 'flex h-6 w-11 items-center rounded-full bg-primary p-1 transition-colors'
                : 'flex h-6 w-11 items-center rounded-full bg-slate-200 p-1 transition-colors'
            }
          >
            <span
              className={
                enabled
                  ? 'h-4 w-4 translate-x-5 rounded-full bg-white shadow-sm transition-transform'
                  : 'h-4 w-4 rounded-full bg-white shadow-sm transition-transform'
              }
            />
          </span>
        </button>
      </div>

      <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <div>
          <Label htmlFor="loyalty-points-euro">Points par euro</Label>
          <Input
            id="loyalty-points-euro"
            type="number"
            min="0"
            step="0.1"
            value={pointsPerEuro}
            onChange={(event) => setPointsPerEuro(event.target.value)}
            className="mt-1 bg-white"
          />
          <p className="mt-1 text-[10px] text-slate-400">Ex. 1 € = 1 point</p>
        </div>

        <div>
          <Label htmlFor="loyalty-threshold">Seuil récompense</Label>
          <Input
            id="loyalty-threshold"
            type="number"
            min="1"
            step="1"
            value={rewardThreshold}
            onChange={(event) => setRewardThreshold(event.target.value)}
            className="mt-1 bg-white"
          />
          <p className="mt-1 text-[10px] text-slate-400">Points nécessaires</p>
        </div>

        <div>
          <Label htmlFor="loyalty-reward">Valeur récompense (€)</Label>
          <Input
            id="loyalty-reward"
            type="number"
            min="0"
            step="0.5"
            value={rewardValue}
            onChange={(event) => setRewardValue(event.target.value)}
            className="mt-1 bg-white"
          />
          <p className="mt-1 text-[10px] text-slate-400">Ex. 200 points = 5 €</p>
        </div>

        <div>
          <Label htmlFor="loyalty-birthday">Bonus anniversaire</Label>
          <Input
            id="loyalty-birthday"
            type="number"
            min="0"
            step="1"
            value={birthdayBonus}
            onChange={(event) => setBirthdayBonus(event.target.value)}
            className="mt-1 bg-white"
          />
          <p className="mt-1 text-[10px] text-slate-400">Points bonus</p>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <div className="flex flex-col gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-violet-800">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>
                Exemple : un client qui dépense 35 € gagne{' '}
                <strong>{Math.floor(35 * (Number(pointsPerEuro) || 0))} points</strong>.
              </span>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm" className="shrink-0">
              {saving ? 'Sauvegarde…' : 'Enregistrer la fidélité'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LoyaltySettingsCard;
