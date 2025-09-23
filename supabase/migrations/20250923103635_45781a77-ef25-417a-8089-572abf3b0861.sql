-- Ajouter le service "Barbe à l'ancienne" au tarif de 15€
INSERT INTO public.services (
  user_id,
  name,
  price,
  duration,
  category,
  appointment_buffer,
  is_active,
  display_order
)
SELECT 
  auth.uid(),
  'Barbe à l''Ancienne',
  15.00,
  25,
  'barbe',
  10,
  true,
  4
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.services 
    WHERE user_id = auth.uid() 
    AND name = 'Barbe à l''Ancienne'
    AND is_active = true
  );