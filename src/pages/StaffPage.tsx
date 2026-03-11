import { useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useStaff, Staff, DailySchedules, ALL_DAYS } from '@/hooks/useStaff';
import { UserPlus, Edit2, Trash2, Users, Phone, Mail, Percent, Clock } from 'lucide-react';
import { StaffPerformance } from '@/components/StaffPerformance';

const roleBadgeColor: Record<string, string> = {
  'gérant': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'coiffeur': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'esthéticien': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'barbier': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'assistant': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

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

const dayLabels: Record<string, string> = {
  Monday: 'Lundi', Tuesday: 'Mardi', Wednesday: 'Mercredi',
  Thursday: 'Jeudi', Friday: 'Vendredi', Saturday: 'Samedi', Sunday: 'Dimanche',
};

const dayLabelsShort: Record<string, string> = {
  Monday: 'Lun', Tuesday: 'Mar', Wednesday: 'Mer',
  Thursday: 'Jeu', Friday: 'Ven', Saturday: 'Sam', Sunday: 'Dim',
};

const StaffPage = () => {
  const { staff, activeStaff, isLoading, createStaff, updateStaff, deleteStaff } = useStaff();
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [scheduleStaff, setScheduleStaff] = useState<Staff | null>(null);
  const [schedules, setSchedules] = useState<DailySchedules>({});

  const openScheduleDialog = (s: Staff) => {
    setScheduleStaff(s);
    setSchedules({ ...s.daily_schedules });
  };

  const toggleDay = (day: string) => {
    setSchedules(prev => {
      const copy = { ...prev };
      if (copy[day]) {
        delete copy[day];
      } else {
        copy[day] = { start: '09:00', end: '19:00' };
      }
      return copy;
    });
  };

  const updateDayTime = (day: string, field: 'start' | 'end', value: string) => {
    setSchedules(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleScheduleSave = async () => {
    if (!scheduleStaff) return;
    const workingDays = Object.keys(schedules);
    await updateStaff.mutateAsync({
      id: scheduleStaff.id,
      updates: {
        daily_schedules: schedules,
        working_days: workingDays,
        start_time: workingDays.length > 0 ? schedules[workingDays[0]].start : '09:00',
        end_time: workingDays.length > 0 ? schedules[workingDays[0]].end : '19:00',
      } as any,
    });
    setScheduleStaff(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string || '').trim();
    if (!name) return;
    const defaultSchedules: DailySchedules = {};
    ALL_DAYS.slice(0, 6).forEach(d => { defaultSchedules[d] = { start: '09:00', end: '19:00' }; });
    await createStaff.mutateAsync({
      name,
      role: fd.get('role') as string || 'coiffeur',
      color: fd.get('color') as string || '#8B5CF6',
      phone: (fd.get('phone') as string) || null,
      email: (fd.get('email') as string) || null,
      commission_rate: parseInt(fd.get('commission') as string || '0') || 0,
      is_active: true,
      start_time: '09:00',
      end_time: '19:00',
      working_days: ALL_DAYS.slice(0, 6),
      daily_schedules: defaultSchedules,
    });
    setIsCreateOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStaff) return;
    const fd = new FormData(e.currentTarget);
    await updateStaff.mutateAsync({
      id: editingStaff.id,
      updates: {
        name: (fd.get('name') as string || '').trim(),
        role: fd.get('role') as string || 'coiffeur',
        color: fd.get('color') as string || '#8B5CF6',
        phone: (fd.get('phone') as string) || null,
        email: (fd.get('email') as string) || null,
        commission_rate: parseInt(fd.get('commission') as string || '0') || 0,
        is_active: editingStaff.is_active,
      },
    });
    setEditingStaff(null);
  };

  const displayedStaff = showInactive ? staff : activeStaff;

  const formatStaffScheduleSummary = (s: Staff) => {
    const ds = s.daily_schedules;
    const days = Object.keys(ds);
    if (days.length === 0) return 'Aucun jour';
    const dayNames = days.map(d => dayLabelsShort[d] || d).join(', ');
    // Check if all days have the same hours
    const firstStart = ds[days[0]]?.start;
    const firstEnd = ds[days[0]]?.end;
    const allSame = days.every(d => ds[d]?.start === firstStart && ds[d]?.end === firstEnd);
    if (allSame) return `${firstStart} - ${firstEnd} · ${dayNames}`;
    return dayNames;
  };

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
            <Button onClick={() => setIsCreateOpen(true)}><UserPlus className="h-4 w-4 mr-2" />Ajouter un membre</Button>
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
                    <Badge className={`mt-1 ${roleBadgeColor[s.role] || roleBadgeColor['assistant']}`}>{s.role}</Badge>
                    {s.phone && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</p>}
                    {s.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</p>}
                    {s.commission_rate > 0 && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Percent className="h-3 w-3" />{s.commission_rate}% commission</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatStaffScheduleSummary(s)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openScheduleDialog(s)} title="Horaires">
                      <Clock className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingStaff(s)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
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
        <StaffPerformance />
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau membre</DialogTitle>
            <DialogDescription>Ajoutez un membre à votre équipe</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit}>
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input name="name" placeholder="Marie Dupont" required />
              </div>
              <div>
                <Label>Rôle</Label>
                <select name="role" defaultValue="coiffeur" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Couleur</Label>
                <div className="flex gap-2 mt-1">
                  {colorOptions.map((c, i) => (
                    <label key={c} className="cursor-pointer">
                      <input type="radio" name="color" value={c} defaultChecked={i === 0} className="sr-only peer" />
                      <div className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-foreground peer-checked:scale-110 transition-transform" style={{ backgroundColor: c }} />
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Téléphone</Label>
                  <Input name="phone" placeholder="0612345678" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input name="email" type="email" placeholder="marie@salon.com" />
                </div>
              </div>
              <div>
                <Label>Commission (%)</Label>
                <Input name="commission" type="number" min={0} max={100} defaultValue="0" />
              </div>
              <Button type="submit" className="w-full" disabled={createStaff.isPending}>
                {createStaff.isPending ? 'En cours...' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={(o) => { if (!o) setEditingStaff(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier {editingStaff?.name}</DialogTitle>
            <DialogDescription>Modifiez les informations du membre</DialogDescription>
          </DialogHeader>
          {editingStaff && (
            <form key={editingStaff.id} onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <Label>Nom *</Label>
                  <Input name="name" defaultValue={editingStaff.name} required />
                </div>
                <div>
                  <Label>Rôle</Label>
                  <select name="role" defaultValue={editingStaff.role} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Couleur</Label>
                  <div className="flex gap-2 mt-1">
                    {colorOptions.map(c => (
                      <label key={c} className="cursor-pointer">
                        <input type="radio" name="color" value={c} defaultChecked={c === editingStaff.color} className="sr-only peer" />
                        <div className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-foreground peer-checked:scale-110 transition-transform" style={{ backgroundColor: c }} />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Téléphone</Label>
                    <Input name="phone" defaultValue={editingStaff.phone || ''} placeholder="0612345678" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input name="email" type="email" defaultValue={editingStaff.email || ''} placeholder="marie@salon.com" />
                  </div>
                </div>
                <div>
                  <Label>Commission (%)</Label>
                  <Input name="commission" type="number" min={0} max={100} defaultValue={editingStaff.commission_rate} />
                </div>
                <Button type="submit" className="w-full" disabled={updateStaff.isPending}>
                  {updateStaff.isPending ? 'En cours...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog - per day configuration */}
      <Dialog open={!!scheduleStaff} onOpenChange={(o) => { if (!o) setScheduleStaff(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Horaires de {scheduleStaff?.name}</DialogTitle>
            <DialogDescription>Configurez les heures de travail pour chaque jour</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {ALL_DAYS.map(day => {
              const isActive = !!schedules[day];
              return (
                <div key={day} className={`rounded-lg border p-3 transition-colors ${isActive ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-medium text-sm">{dayLabels[day]}</Label>
                    <Switch checked={isActive} onCheckedChange={() => toggleDay(day)} />
                  </div>
                  {isActive && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={schedules[day]?.start || '09:00'}
                        onChange={e => updateDayTime(day, 'start', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <span className="text-muted-foreground text-xs">à</span>
                      <Input
                        type="time"
                        value={schedules[day]?.end || '19:00'}
                        onChange={e => updateDayTime(day, 'end', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                  {!isActive && (
                    <p className="text-xs text-muted-foreground">Repos</p>
                  )}
                </div>
              );
            })}
          </div>
          <Button onClick={handleScheduleSave} className="w-full" disabled={updateStaff.isPending}>
            {updateStaff.isPending ? 'En cours...' : 'Enregistrer les horaires'}
          </Button>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default StaffPage;
