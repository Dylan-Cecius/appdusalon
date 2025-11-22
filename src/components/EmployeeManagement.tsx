import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEmployees } from '@/hooks/useEmployees';
import { UserPlus, Edit2, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const colorOptions = [
  { value: 'bg-blue-600', label: 'Bleu' },
  { value: 'bg-purple-600', label: 'Violet' },
  { value: 'bg-green-600', label: 'Vert' },
  { value: 'bg-red-600', label: 'Rouge' },
  { value: 'bg-orange-600', label: 'Orange' },
  { value: 'bg-pink-600', label: 'Rose' },
  { value: 'bg-teal-600', label: 'Turquoise' },
  { value: 'bg-indigo-600', label: 'Indigo' },
];

export const EmployeeManagement = () => {
  const { employees, isLoading, createEmployee, updateEmployee, toggleEmployeeStatus } = useEmployees();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);

  const [newEmployee, setNewEmployee] = useState({
    email: '',
    display_name: '',
    color: 'bg-blue-600',
    role: 'employee' as 'admin' | 'employee',
  });

  const handleCreateEmployee = async () => {
    if (!newEmployee.email || !newEmployee.display_name) {
      return;
    }

    await createEmployee.mutateAsync(newEmployee);
    setIsCreateModalOpen(false);
    setNewEmployee({
      email: '',
      display_name: '',
      color: 'bg-blue-600',
      role: 'employee',
    });
  };

  const handleUpdateEmployee = async (id: string, updates: any) => {
    await updateEmployee.mutateAsync({ id, updates });
    setEditingEmployee(null);
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestion des Employés
            </CardTitle>
            <CardDescription>
              Gérez les comptes et permissions de vos employés
            </CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Nouvel Employé
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouvel employé</DialogTitle>
                <DialogDescription>
                  L'employé recevra un email pour créer son mot de passe
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="employe@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="display_name">Nom d'affichage</Label>
                  <Input
                    id="display_name"
                    value={newEmployee.display_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, display_name: e.target.value })}
                    placeholder="Jean Dupont"
                  />
                </div>
                <div>
                  <Label htmlFor="color">Couleur (agenda)</Label>
                  <Select
                    value={newEmployee.color}
                    onValueChange={(value) => setNewEmployee({ ...newEmployee, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${option.value}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role">Rôle</Label>
                  <Select
                    value={newEmployee.role}
                    onValueChange={(value: 'admin' | 'employee') => setNewEmployee({ ...newEmployee, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employé</SelectItem>
                      <SelectItem value="admin">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateEmployee} className="w-full" disabled={createEmployee.isPending}>
                  {createEmployee.isPending ? 'Création...' : 'Créer l\'employé'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full ${employee.color} flex items-center justify-center text-white font-semibold`}>
                  {employee.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{employee.display_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                      {employee.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Switch
                  checked={employee.is_active}
                  onCheckedChange={(checked) =>
                    toggleEmployeeStatus.mutate({ id: employee.id, isActive: checked })
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingEmployee(employee.id)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
