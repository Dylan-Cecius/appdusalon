-- Create table for salon settings
CREATE TABLE public.salon_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'SalonPOS',
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (since this is a single salon app)
CREATE POLICY "Public access to salon settings" 
ON public.salon_settings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create table for barbers with persistent data
CREATE TABLE public.barbers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_time text NOT NULL DEFAULT '10:00',
  end_time text NOT NULL DEFAULT '19:00',
  is_active boolean NOT NULL DEFAULT true,
  color text NOT NULL DEFAULT 'bg-blue-600',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Public access to barbers" 
ON public.barbers 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create table for todo items
CREATE TABLE public.todo_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_completed boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date date,
  created_by text DEFAULT 'admin',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.todo_items ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Public access to todo items" 
ON public.todo_items 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_salon_settings_updated_at
  BEFORE UPDATE ON public.salon_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_barbers_updated_at
  BEFORE UPDATE ON public.barbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_todo_items_updated_at
  BEFORE UPDATE ON public.todo_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default barbers
INSERT INTO public.barbers (id, name, start_time, end_time, is_active, color) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Alex', '10:00', '19:00', true, 'bg-blue-600'),
('550e8400-e29b-41d4-a716-446655440002', 'Marie', '10:00', '17:00', true, 'bg-purple-600'),
('550e8400-e29b-41d4-a716-446655440003', 'Thomas', '12:00', '19:00', true, 'bg-green-600');

-- Insert default salon settings
INSERT INTO public.salon_settings (name) VALUES ('La Barbe à Papa');