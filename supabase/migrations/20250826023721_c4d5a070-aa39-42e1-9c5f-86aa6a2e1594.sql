-- Ajouter les nouveaux services manquants.
-- Cette migration historique doit aussi être rejouable sur une base V2 neuve,
-- où public.services(name) n'a pas encore de contrainte UNIQUE.
INSERT INTO public.services (
  name,
  price,
  duration,
  category,
  appointment_buffer,
  is_active,
  display_order
)
SELECT v.name, v.price, v.duration, v.category, v.appointment_buffer, v.is_active, v.display_order
FROM (
  VALUES
    ('Double Ancienne'::text, 32.00::numeric, 60::integer, 'combo'::text, 20::integer, true, 10::integer),
    ('Coupe + Barbe à l''Ancienne'::text, 28.00::numeric, 50::integer, 'combo'::text, 15::integer, true, 11::integer),
    ('Coupe Enfant'::text, 16.00::numeric, 25::integer, 'coupe'::text, 5::integer, true, 12::integer)
) AS v(name, price, duration, category, appointment_buffer, is_active, display_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.services s
  WHERE s.name = v.name
);

-- Mettre à jour la catégorie 'general' vers 'combo' s'il y en a
UPDATE public.services
SET category = 'combo'
WHERE category = 'general';
