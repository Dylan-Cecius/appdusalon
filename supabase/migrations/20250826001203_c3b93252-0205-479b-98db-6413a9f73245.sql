-- Update the check constraint to include 'appointment' as a valid block_type
ALTER TABLE public.custom_blocks 
DROP CONSTRAINT custom_blocks_block_type_check;

ALTER TABLE public.custom_blocks 
ADD CONSTRAINT custom_blocks_block_type_check 
CHECK (block_type IN ('appointment', 'break', 'unavailable', 'rdv-comptable', 'rdv-medecin', 'formation', 'conge', 'other'));