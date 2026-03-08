import { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useStaff, Staff } from '@/hooks/useStaff';
import { UserPlus, Edit2, Trash2, Users, Phone, Mail, Percent } from 'lucide-react';
import { StaffPerformance } from '@/components/StaffPerformance';

const roleOptions = [
  { value: 'gérant', label: 'Gérant' },
  { value: 'coiffeur', label: 'Coiffeur' },
  { value: 'esthéticien', label: 'Esthéticien' },
  { value: 'barbier', label: 'Barbier' },
  { value: 'assistant', label: 'Assistant' },
];

const colorOptions = [
  '#8B5CF6', '#3B82F6', '#EC4899', '#EF4444',
  '#F97316', '#22C55E', '#14B8A6', '#6366F1',
];

const roleBadgeColor: Record<string, string> = {
  'gérant': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'coiffeur': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'esthéticien': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'barbier': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'assistant': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const StaffPage = () => {
  const { staff, activeStaff, isLoading, createStaff, updateStaff, deleteStaff } = useStaff();
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const [form, setForm] = useState({
    name: '',
    role: 'coiffeur',
    color: '#8B5CF6',
    phone: '',
    email: '',
    commission_rate: 0,
    is_active: true,
  });

  const resetForm = () => setForm({ name: '', role: 'coiffeur', color: '#8B5CF6', phone: '', email: '', commission_rate: 0, is_active: true });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await createStaff.mutateAsync({
      name: form.name,
      role: form.role,
      color: form.color,
      phone: form.phone || null,
      email: form.email || null,
      commission_rate: form.commission_rate,
      is_active: true,
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!editingStaff) return;
    await updateStaff.mutateAsync({
      id: editingStaff.id,
      updates: {
        name: form.name,
        role: form.role,
        color: form.color,
        phone: form.phone || null,
        email: form.email || null,
        commission_rate: form.commission_rate,
        is_active: form.is_active,
      },
    });
    setEditingStaff(null);
    resetForm();
  };

  const openEdit = (s: Staff) => {
    setForm({
      name: s.name,
      role: s.role,
      color: s.color,
      phone: s.phone || '',
      email: s.email || '',
      commission_rate: s.commission_rate,
      is_active: s.is_active,
    });
    setEditingStaff(s);
  };

  const displayedStaff = showInactive ? staff : activeStaff;

  const StaffForm = ({ onSubmit, submitLabel, isPending }: { onSubmit: () => void; submitLabel: string; isPending: boolean }) => (
    <div className="space-y-4">
      <div>
        <Label>Nom *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Marie Dupont" />
      </div>
      <div>
        <Label>Rôle</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {roleOptions.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Couleur</Label>
        <div className="flex gap-2 mt-1">
          {colorOptions.map(c => (
            <button
              key={c}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-transform ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              onClick={() => setForm({ ...form, color: c })}
            />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Téléphone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0612345678" />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="marie@salon.com" />
        </div>
      </div>
      <div>
        <Label>Commission (%)</Label>
        <Input type="number" min={0} max={100} value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: parseInt(e.target.value) || 0 })} />
      </div>
      <Button onClick={onSubmit} className="w-full" disabled={isPending || !form.name.trim()}>
        {isPending ? 'En cours...' : submitLabel}
      </Button>
    </div>
  );

  if (isLoading) return <MainLayout><div className="p-8 text-center text-muted-foreground">Chargement...</div></MainLayout>;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Mon équipe</h2>
            <p className="text-sm text-muted-foreground">{activeStaff.length} membre{activeStaff.length > 1 ? 's' : ''} actif{activeStaff.length > 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={showInactive} onCheckedChange={setShowInactive} />
              <Label className="text-sm">Voir inactifs</Label>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={(o) => { setIsCreateOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />Ajouter un membre</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau membre</DialogTitle>
                  <DialogDescription>Ajoutez un membre à votre équipe</DialogDescription>
                </DialogHeader>
                <StaffForm onSubmit={handleCreate} submitLabel="Ajouter" isPending={createStaff.isPending} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedStaff.map((s) => (
            <Card key={s.id} className={`transition-opacity ${!s.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ backgroundColor: s.color }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{s.name}</h3>
                    <Badge className={`mt-1 ${roleBadgeColor[s.role] || roleBadgeColor['assistant']}`}>
                      {s.role}
                    </Badge>
                    {s.phone && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</p>
                    )}
                    {s.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</p>
                    )}
                    {s.commission_rate > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Percent className="h-3 w-3" />{s.commission_rate}% commission</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer {s.name} ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteStaff.mutate(s.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {displayedStaff.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun membre dans l'équipe</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={(o) => { if (!o) { setEditingStaff(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier {editingStaff?.name}</DialogTitle>
            <DialogDescription>Modifiez les informations du membre</DialogDescription>
          </DialogHeader>
          <StaffForm onSubmit={handleEdit} submitLabel="Enregistrer" isPending={updateStaff.isPending} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default StaffPage;
