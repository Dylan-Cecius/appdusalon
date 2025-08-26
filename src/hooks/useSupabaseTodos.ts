import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface TodoItem {
  id: string;
  barber_id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useSupabaseTodos = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTodos([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('todo_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching todos:', error);
        return;
      }

      if (data) {
        setTodos(data as TodoItem[]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async (todo: Omit<TodoItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('todo_items')
        .insert({
          ...todo,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter la tâche",
          variant: "destructive"
        });
        return;
      }

      setTodos(prev => [data as TodoItem, ...prev]);
      toast({
        title: "Succès",
        description: "Tâche ajoutée avec succès"
      });
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const updateTodo = async (id: string, updates: Partial<TodoItem>) => {
    try {
      const { data, error } = await supabase
        .from('todo_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour la tâche",
          variant: "destructive"
        });
        return;
      }

      setTodos(prev => prev.map(t => t.id === id ? data as TodoItem : t));
      toast({
        title: "Succès",
        description: "Tâche mise à jour avec succès"
      });
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todo_items')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer la tâche",
          variant: "destructive"
        });
        return;
      }

      setTodos(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Succès",
        description: "Tâche supprimée avec succès"
      });
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const toggleComplete = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    await updateTodo(id, { is_completed: !todo.is_completed });
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return {
    todos,
    loading,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    fetchTodos
  };
};