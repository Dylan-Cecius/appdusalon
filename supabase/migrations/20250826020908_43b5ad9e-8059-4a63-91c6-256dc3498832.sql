-- Create services table for dynamic service management
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  category TEXT NOT NULL DEFAULT 'general',
  appointment_buffer INTEGER DEFAULT 0, -- buffer time in minutes
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policies for services
CREATE POLICY "Users can manage their own services" 
ON public.services 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add stats_password field to salon_settings
ALTER TABLE public.salon_settings 
ADD COLUMN stats_password TEXT DEFAULT NULL;

-- Insert default services for existing users
INSERT INTO public.services (user_id, name, price, duration, category, appointment_buffer, display_order) 
SELECT 
  auth.uid(),
  service_data.name,
  service_data.price,
  service_data.duration,
  service_data.category,
  service_data.appointment_buffer,
  service_data.display_order
FROM (
  VALUES 
    ('Coupe Homme', 18.00, 30, 'coupe', 10, 1),
    ('Coupe Femme', 25.00, 45, 'coupe', 15, 2),
    ('Barbe', 12.00, 20, 'barbe', 10, 3),
    ('Coupe + Barbe', 23.00, 40, 'combo', 15, 4),
    ('Coupe Enfant', 15.00, 25, 'coupe', 10, 5),
    ('Shampoing', 8.00, 15, 'soin', 5, 6),
    ('Coloration', 45.00, 90, 'couleur', 30, 7),
    ('Mèches', 55.00, 120, 'couleur', 30, 8)
) AS service_data(name, price, duration, category, appointment_buffer, display_order)
WHERE auth.uid() IS NOT NULL;