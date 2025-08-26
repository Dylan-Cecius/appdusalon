-- Create table for lunch breaks
CREATE TABLE public.lunch_breaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  start_time text NOT NULL,
  end_time text NOT NULL,
  duration integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(barber_id)
);

-- Enable RLS
ALTER TABLE public.lunch_breaks ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Public access to lunch breaks" 
ON public.lunch_breaks 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create table for custom blocks (blocked time slots)
CREATE TABLE public.custom_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  block_date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  title text NOT NULL,
  block_type text NOT NULL DEFAULT 'unavailable' CHECK (block_type IN ('break', 'unavailable', 'rdv-comptable', 'rdv-medecin', 'formation', 'conge', 'other')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_blocks ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Public access to custom blocks" 
ON public.custom_blocks 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_lunch_breaks_updated_at
  BEFORE UPDATE ON public.lunch_breaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_blocks_updated_at
  BEFORE UPDATE ON public.custom_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();