import { useState, useCallback, useRef } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useStaff, Staff } from '@/hooks/useStaff';
import { UserPlus, Edit2, Trash2, Users, Phone, Mail, Percent } from 'lucide-react';
import { StaffPerformance } from '@/components/StaffPerformance';
import StaffForm, { StaffFormData } from '@/components/StaffForm';

const roleBadgeColor: Record<string, string> = {
  'gérant': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'coiffeur': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'esthéticien': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'barbier': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'assistant': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const defaultForm: StaffFormData = { name: '', role: 'coiffeur', color: '#8B5CF6', phone: '', email: '', commission_rate: 0, is_active: true };

const StaffPage = () => {
  const { staff, activeStaff, isLoading, createStaff, updateStaff, deleteStaff } = useStaff();
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  // Use refs for mutation functions to keep callbacks stable
  const createStaffRef = useRef(createStaff);
  createStaffRef.current = createStaff;
  const updateStaffRef = useRef(updateStaff);
  updateStaffRef.current = updateStaff;
  const editingStaffRef = useRef(editingStaff);
  editingStaffRef.current = editingStaff;

  const handleCreate = useCallback(async (data: StaffFormData) => {
    if (!data.name.trim()) return;
    await createStaffRef.current.mutateAsync({
      name: data.name, role: data.role, color: data.color,
      phone: data.phone || null, email: data.email || null,
      commission_rate: data.commission_rate, is_active: true,
    });
    setIsCreateOpen(false);
  }, []);

  const handleEdit = useCallback(async (data: StaffFormData) => {
    const current = editingStaffRef.current;
    if (!current) return;
    await updateStaffRef.current.mutateAsync({
      id: current.id,
      updates: {
        name: data.name, role: data.role, color: data.color,
        phone: data.phone || null, email: data.email || null,
        commission_rate: data.commission_rate, is_active: data.is_active,
      },
    });
    setEditingStaff(null);
  }, []);

  const handleEditDialogChange = useCallback((o: boolean) => {
    if (!o) setEditingStaff(null);
  }, []);

  const editInitialValues: StaffFormData = editingStaff ? {
    name: editingStaff.name,
    role: editingStaff.role,
    color: editingStaff.color,
    phone: editingStaff.phone || '',
    email: editingStaff.email || '',
    commission_rate: editingStaff.commission_rate,
    is_active: editingStaff.is_active,
  } : defaultForm;

  const displayedStaff = showInactive ? staff : activeStaff;

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
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button><UserPlus className="h-4 w-4 mr-2" />Ajouter un membre</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouveau membre</DialogTitle>
                  <DialogDescription>Ajoutez un membre à votre équipe</DialogDescription>
                </DialogHeader>
                <StaffForm key="create" initialValues={defaultForm} onSubmit={handleCreate} submitLabel="Ajouter" isPending={createStaff.isPending} />
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
                    <Badge className={`mt-1 ${roleBadgeColor[s.role] || roleBadgeColor['assistant']}`}>{s.role}</Badge>
                    {s.phone && <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</p>}
                    {s.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</p>}
                    {s.commission_rate > 0 && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Percent className="h-3 w-3" />{s.commission_rate}% commission</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingStaff(s)}><Edit2 className="h-3.5 w-3.5" /></Button>
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

      {/* Edit Dialog — key={id} remounts form only when switching staff */}
      <Dialog open={!!editingStaff} onOpenChange={handleEditDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier {editingStaff?.name}</DialogTitle>
            <DialogDescription>Modifiez les informations du membre</DialogDescription>
          </DialogHeader>
          <StaffForm key={editingStaff?.id || 'none'} initialValues={editInitialValues} onSubmit={handleEdit} submitLabel="Enregistrer" isPending={updateStaff.isPending} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default StaffPage;
