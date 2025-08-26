import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CheckSquare, Square, Calendar, AlertCircle, Trash2, Clock } from 'lucide-react';
import { useSupabaseTodos } from '@/hooks/useSupabaseTodos';
import { useSupabaseSettings } from '@/hooks/useSupabaseSettings';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TodoList = () => {
  const { todos, loading, addTodo, deleteTodo, toggleComplete } = useSupabaseTodos();
  const { barbers } = useSupabaseSettings();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBarberId, setSelectedBarberId] = useState(barbers[0]?.id || '');
  const [newTodo, setNewTodo] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: ''
  });

  const handleAddTodo = async () => {
    if (!newTodo.title.trim() || !selectedBarberId) return;

    await addTodo({
      ...newTodo,
      barber_id: selectedBarberId,
      is_completed: false,
      created_by: 'admin',
      due_date: newTodo.due_date || undefined
    });

    setNewTodo({
      title: '',
      description: '',
      priority: 'medium',
      due_date: ''
    });
    setIsAddModalOpen(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-3 w-3" />;
      case 'medium': return <Clock className="h-3 w-3" />;
      case 'low': return <CheckSquare className="h-3 w-3" />;
      default: return null;
    }
  };

  const filterTodosByBarber = (barberId: string) => {
    return todos.filter(todo => todo.barber_id === barberId);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center">Chargement des tâches...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">To-Do List par Coiffeur</h2>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une tâche
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nouvelle tâche</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="barber-select">Coiffeur</Label>
                <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un coiffeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbers.map(barber => (
                      <SelectItem key={barber.id} value={barber.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded ${barber.color}`}></div>
                          {barber.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
                  placeholder="Titre de la tâche"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({...newTodo, description: e.target.value})}
                  placeholder="Détails de la tâche"
                />
              </div>

              <div>
                <Label htmlFor="priority">Priorité</Label>
                <Select value={newTodo.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewTodo({...newTodo, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due-date">Date d'échéance (optionnel)</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={newTodo.due_date}
                  onChange={(e) => setNewTodo({...newTodo, due_date: e.target.value})}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddTodo} className="flex-1">
                  Ajouter
                </Button>
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue={barbers[0]?.id} className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-md bg-card">
          {barbers.map(barber => {
            const barberTodos = filterTodosByBarber(barber.id);
            const completedCount = barberTodos.filter(t => t.is_completed).length;
            const totalCount = barberTodos.length;
            
            return (
              <TabsTrigger key={barber.id} value={barber.id} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${barber.color}`}></div>
                <span>{barber.name}</span>
                <Badge variant="secondary" className="ml-1">
                  {completedCount}/{totalCount}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {barbers.map(barber => {
          const barberTodos = filterTodosByBarber(barber.id);
          
          return (
            <TabsContent key={barber.id} value={barber.id}>
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-4 h-4 rounded ${barber.color}`}></div>
                    <h3 className="text-lg font-semibold">Tâches de {barber.name}</h3>
                    <Badge variant="outline">
                      {barberTodos.filter(t => !t.is_completed).length} en cours
                    </Badge>
                  </div>
                  
                  {barberTodos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune tâche assignée à {barber.name}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {barberTodos.map(todo => (
                        <div
                          key={todo.id}
                          className={`p-4 border rounded-lg transition-all ${
                            todo.is_completed ? 'bg-muted/50 opacity-75' : 'bg-card'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={todo.is_completed}
                              onCheckedChange={() => toggleComplete(todo.id)}
                              className="mt-1"
                            />
                            
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className={`font-medium ${todo.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                  {todo.title}
                                </h4>
                                
                                <div className="flex items-center gap-2">
                                  <Badge className={getPriorityColor(todo.priority)} variant="secondary">
                                    <div className="flex items-center gap-1">
                                      {getPriorityIcon(todo.priority)}
                                      <span className="capitalize">{todo.priority}</span>
                                    </div>
                                  </Badge>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteTodo(todo.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {todo.description && (
                                <p className={`text-sm ${todo.is_completed ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                  {todo.description}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {todo.due_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      Échéance: {format(new Date(todo.due_date), 'dd/MM/yyyy', { locale: fr })}
                                    </span>
                                  </div>
                                )}
                                <span>
                                  Créée le {format(new Date(todo.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default TodoList;