import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BlockData } from '@/components/BlockModal';
import { format } from 'date-fns';

export interface CustomBlock extends BlockData {
  id: string;
  barberId: string;
  blockDate: Date;
}

export const useSupabaseCustomBlocks = () => {
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomBlocks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_blocks')
        .select('*')
        .order('block_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching custom blocks:', error);
        return;
      }

      if (data) {
        const mappedData: CustomBlock[] = data.map(item => ({
          id: item.id,
          barberId: item.barber_id,
          blockDate: new Date(item.block_date),
          startTime: item.start_time,
          endTime: item.end_time,
          title: item.title,
          type: item.block_type as BlockData['type'],
          notes: item.notes || undefined
        }));
        setCustomBlocks(mappedData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCustomBlock = async (blockData: BlockData, barberId: string, date: Date) => {
    try {
      const { data, error } = await supabase
        .from('custom_blocks')
        .insert({
          barber_id: barberId,
          block_date: format(date, 'yyyy-MM-dd'),
          start_time: blockData.startTime,
          end_time: blockData.endTime,
          title: blockData.title,
          block_type: blockData.type,
          notes: blockData.notes
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter le créneau bloqué",
          variant: "destructive"
        });
        return;
      }

      const newBlock: CustomBlock = {
        id: data.id,
        barberId: data.barber_id,
        blockDate: new Date(data.block_date),
        startTime: data.start_time,
        endTime: data.end_time,
        title: data.title,
        type: data.block_type as BlockData['type'],
        notes: data.notes || undefined
      };

      setCustomBlocks(prev => [...prev, newBlock]);
      toast({
        title: "Succès",
        description: `Créneau "${blockData.title}" ajouté avec succès`
      });
    } catch (error) {
      console.error('Error adding custom block:', error);
    }
  };

  const updateCustomBlock = async (id: string, updates: Partial<BlockData>) => {
    try {
      const { data, error } = await supabase
        .from('custom_blocks')
        .update({
          start_time: updates.startTime,
          end_time: updates.endTime,
          title: updates.title,
          block_type: updates.type,
          notes: updates.notes
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de modifier le créneau bloqué",
          variant: "destructive"
        });
        return;
      }

      setCustomBlocks(prev => prev.map(block => 
        block.id === id 
          ? {
              ...block,
              startTime: data.start_time,
              endTime: data.end_time,
              title: data.title,
              type: data.block_type as BlockData['type'],
              notes: data.notes || undefined
            }
          : block
      ));

      toast({
        title: "Succès",
        description: "Créneau modifié avec succès"
      });
    } catch (error) {
      console.error('Error updating custom block:', error);
    }
  };

  const deleteCustomBlock = async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_blocks')
        .delete()
        .eq('id', id);

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le créneau bloqué",
          variant: "destructive"
        });
        return;
      }

      const deletedBlock = customBlocks.find(b => b.id === id);
      setCustomBlocks(prev => prev.filter(block => block.id !== id));
      toast({
        title: "Succès",
        description: `Créneau "${deletedBlock?.title}" supprimé avec succès`
      });
    } catch (error) {
      console.error('Error deleting custom block:', error);
    }
  };

  const getCustomBlocksForSlot = (date: Date, timeSlot: string, barberId: string) => {
    return customBlocks.filter(block => {
      if (block.barberId !== barberId) return false;
      if (format(block.blockDate, 'yyyy-MM-dd') !== format(date, 'yyyy-MM-dd')) return false;
      if (block.startTime !== timeSlot) return false;
      return true;
    });
  };

  useEffect(() => {
    fetchCustomBlocks();
  }, []);

  return {
    customBlocks,
    loading,
    addCustomBlock,
    updateCustomBlock,
    deleteCustomBlock,
    getCustomBlocksForSlot,
    fetchCustomBlocks
  };
};