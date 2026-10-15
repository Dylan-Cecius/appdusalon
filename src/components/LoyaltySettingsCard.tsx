import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLoyalty } from '@/hooks/useLoyalty';
import { LoyaltyProgramForm } from './LoyaltyProgramForm';

const LoyaltySettingsCard = () => {
  const { program, loading, error, refresh, saveProgram, contextKey, canManage } = useLoyalty();
  return <div className="space-y-3">
    {error && <Card className="p-4"><p role="alert">{error} Votre saisie est conservée.</p><Button variant="outline" onClick={() => void refresh()}>Réessayer la fidélité</Button></Card>}
    {loading && <p role="status">Chargement de la fidélité…</p>}
    {!loading && !error && !program && <p role="status">Sélectionnez un salon pour consulter la fidélité.</p>}
    {program && <LoyaltyProgramForm key={contextKey} program={program} disabled={loading || !!error || !canManage} onRefresh={() => void refresh()} saveProgram={saveProgram} />}
  </div>;
};
export default LoyaltySettingsCard;
