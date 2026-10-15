import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { clientCreateInput, ClientDraftError, type ClientCreateDraft, type ClientCreateInput } from '@/lib/clientCreateDraft';
import { runExclusiveAction } from '@/lib/exclusiveAction';

const emptyDraft: ClientCreateDraft = { name: '', phone: '', email: '', birth_date: '', notes: '' };

export default function NewClientDialog({ open, onOpenChange, canUseNotes, onCreate, trigger }: {
  trigger?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canUseNotes: boolean;
  onCreate: (input: ClientCreateInput) => Promise<{ id: string } | null | undefined>;
}) {
  const [draft, setDraft] = useState(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const changeOpen = (next: boolean) => {
    if (pending.current) return;
    setError(null);
    onOpenChange(next);
  };
  const submit = () => runExclusiveAction(pending, async () => {
    setSaving(true); setError(null);
    try {
      const result = await onCreate(clientCreateInput(draft, canUseNotes));
      if (!result?.id) throw new Error('client_creation_unconfirmed');
      setDraft(emptyDraft);
      onOpenChange(false);
    } catch (failure) {
      setError(failure instanceof ClientDraftError ? failure.message : 'Création non confirmée. Vos saisies sont conservées ; vérifiez votre connexion et réessayez.');
    } finally {
      setSaving(false);
    }
  });

  return <Dialog open={open} onOpenChange={changeOpen}>
    {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Ajouter un client</DialogTitle><DialogDescription>Créez une fiche pour un nouveau client.</DialogDescription></DialogHeader>
      <form className="space-y-4" aria-busy={saving} onSubmit={event => { event.preventDefault(); void submit(); }}>
        {saving && <p role="status" className="text-sm text-muted-foreground">Création en cours…</p>}
        {error && <p role="alert" ref={errorRef} tabIndex={-1} className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
        <fieldset disabled={saving} className="space-y-4">
          <div><Label htmlFor="new-client-name">Nom complet *</Label><Input id="new-client-name" required autoComplete="name" value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="Jean Dupont" /></div>
          <div><Label htmlFor="new-client-phone">Téléphone *</Label><Input id="new-client-phone" type="tel" required autoComplete="tel" value={draft.phone} onChange={event => setDraft(current => ({ ...current, phone: event.target.value }))} placeholder="0123456789" /></div>
          <div><Label htmlFor="new-client-email">Email</Label><Input id="new-client-email" type="email" autoComplete="email" value={draft.email} onChange={event => setDraft(current => ({ ...current, email: event.target.value }))} placeholder="jean@example.com" /></div>
          <div><Label htmlFor="new-client-birth">Date de naissance</Label><Input id="new-client-birth" type="date" value={draft.birth_date} onChange={event => setDraft(current => ({ ...current, birth_date: event.target.value }))} /><p className="mt-1 text-xs text-muted-foreground">Utilisée pour les automatisations anniversaire et le bonus fidélité.</p></div>
          {canUseNotes ? <div><Label htmlFor="new-client-notes">Notes</Label><Textarea id="new-client-notes" value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} placeholder="Préférences, allergies, remarques…" rows={3} /></div>
            : <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">Les notes client complètes sont disponibles à partir du plan Solo.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => changeOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving || !draft.name.trim() || !draft.phone.trim()}>{saving ? 'Création…' : 'Ajouter'}</Button>
          </DialogFooter>
        </fieldset>
      </form>
    </DialogContent>
  </Dialog>;
}
