import { useEffect, useRef, useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { runExclusiveAction } from '@/lib/exclusiveAction';
import { loyaltyFields, type LoyaltyFields } from '@/lib/loyaltyPersistence';
import type { LoyaltyProgram } from '@/lib/loyaltyRead';

interface Props {
  program: LoyaltyProgram;
  disabled: boolean;
  onRefresh: () => void;
  saveProgram: (fields: LoyaltyFields, revision: string | null) => Promise<LoyaltyProgram>;
}
export const LoyaltyProgramForm = ({ program, disabled, onRefresh, saveProgram }: Props) => {
  const [baseline, setBaseline] = useState(program);
  const [enabled, setEnabled] = useState(program.enabled);
  const [pointsPerEuro, setPointsPerEuro] = useState(String(program.points_per_euro));
  const [rewardThreshold, setRewardThreshold] = useState(String(program.reward_threshold));
  const [rewardValue, setRewardValue] = useState(String(program.reward_value));
  const [birthdayBonus, setBirthdayBonus] = useState(String(program.birthday_bonus));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const lock = useRef(false);
  const current = useRef(true);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { current.current = true; return () => { current.current = false; }; }, []);
  useEffect(() => { if (saveError) errorRef.current?.focus(); }, [saveError]);
  const blocked = saving || disabled;
  const adopt = (p: LoyaltyProgram) => {
    setBaseline(p); setEnabled(p.enabled); setPointsPerEuro(String(p.points_per_euro));
    setRewardThreshold(String(p.reward_threshold)); setRewardValue(String(p.reward_value)); setBirthdayBonus(String(p.birthday_bonus));
  };
  const handleSave = async () => {
    if (blocked) return;
    await runExclusiveAction(lock, async () => {
      setSaveError(null); setMessage(null);
      let fields: LoyaltyFields;
      try { fields = loyaltyFields({ enabled, points_per_euro: pointsPerEuro, reward_threshold: rewardThreshold, reward_value: rewardValue, birthday_bonus: birthdayBonus }); }
      catch (error) { setSaveError(error instanceof Error ? error.message : 'Vérifiez les réglages.'); return; }
      setSaving(true);
      try {
        const saved = await saveProgram(fields, baseline.updated_at);
        if (!saved || saved.salon_id !== program.salon_id || !saved.updated_at) throw new Error('unconfirmed');
        if (current.current) { adopt(saved); setMessage('Programme fidélité enregistré.'); }
      } catch {
        if (current.current) setSaveError('Impossible de confirmer la sauvegarde. Votre saisie est conservée. Actualisez les réglages pour vérifier leur état, puis reprenez-les avant de modifier à nouveau.');
      } finally { if (current.current) setSaving(false); }
    });
  };
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
          role="switch" aria-checked={enabled} aria-label="Activer le programme fidélité" disabled={blocked}
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

      {saveError && <p role="alert" ref={errorRef} tabIndex={-1} className="m-4 text-sm text-destructive">{saveError}</p>}
      {message && <p role="status" className="m-4 text-sm">{message}</p>}
      {saving && <p role="status" className="m-4 text-sm">Enregistrement en cours…</p>}
      <div className="flex flex-wrap gap-2 p-4">
        <Button variant="outline" size="sm" disabled={blocked} onClick={onRefresh}>Actualiser les réglages</Button>
        <Button variant="outline" size="sm" disabled={blocked} onClick={() => { adopt(program); setSaveError(null); setMessage('Les réglages chargés ont été repris.'); }}>Reprendre les réglages chargés</Button>
        {program.updated_at !== baseline.updated_at && <p className="text-sm">Les réglages ont changé. Votre saisie est conservée ; reprenez les réglages chargés avant une nouvelle modification.</p>}
      </div>
      <div className="grid gap-4 bg-slate-50/60 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <div>
          <Label htmlFor="loyalty-points-euro">Points par euro</Label>
          <Input
            disabled={blocked}
            id="loyalty-points-euro"
            type="number"
            min="0"
            step="0.001" max="100"
            value={pointsPerEuro}
            onChange={(event) => setPointsPerEuro(event.target.value)}
            className="mt-1 bg-white"
          />
          <p className="mt-1 text-[10px] text-slate-400">Ex. 1 € = 1 point</p>
        </div>

        <div>
          <Label htmlFor="loyalty-threshold">Seuil récompense</Label>
          <Input
            disabled={blocked}
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
            disabled={blocked}
            id="loyalty-reward"
            type="number"
            min="0"
            step="0.01" max="99999999.99"
            value={rewardValue}
            onChange={(event) => setRewardValue(event.target.value)}
            className="mt-1 bg-white"
          />
          <p className="mt-1 text-[10px] text-slate-400">Ex. 200 points = 5 €</p>
        </div>

        <div>
          <Label htmlFor="loyalty-birthday">Bonus anniversaire</Label>
          <Input
            disabled={blocked}
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
                <strong>{Number.isFinite(Number(pointsPerEuro)) && Number(pointsPerEuro) >= 0 && Number(pointsPerEuro) <= 100 && pointsPerEuro.trim() ? Math.floor(35 * Number(pointsPerEuro)) : '—'} points</strong>.
              </span>
            </div>
            <Button onClick={handleSave} disabled={blocked} size="sm" className="shrink-0">
              {saving ? 'Sauvegarde…' : 'Enregistrer la fidélité'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
