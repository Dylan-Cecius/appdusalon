-- Ajouter les nouveaux services manquants
INSERT INTO public.services (name, price, duration, category, appointment_buffer, is_active, display_order)
VALUES 
  ('Double Ancienne', 32.00, 60, 'combo', 20, true, 10),
  ('Coupe + Barbe à l''Ancienne', 28.00, 50, 'combo', 15, true, 11),
  ('Coupe Enfant', 16.00, 25, 'coupe', 5, true, 12)
ON CONFLICT (name) DO NOTHING;

-- Mettre à jour la catégorie 'general' vers 'combo' s'il y en a
UPDATE public.services 
SET category = 'combo' 
WHERE category = 'general';