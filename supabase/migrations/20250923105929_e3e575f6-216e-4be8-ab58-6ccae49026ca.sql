-- Corriger l'ajout du service "Barbe à l'Ancienne" 
-- Insérer le service pour tous les utilisateurs existants qui n'ont pas encore ce service

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
SELECT DISTINCT 
  s.user_id,
  'Barbe à l''Ancienne',
  15.00,
  25,
  'barbe',
  10,
  true,
  4
FROM public.services s
WHERE s.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.services 
    WHERE user_id = s.user_id 
    AND name = 'Barbe à l''Ancienne'
    AND is_active = true
  );