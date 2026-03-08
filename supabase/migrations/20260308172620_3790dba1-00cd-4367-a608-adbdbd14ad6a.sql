ALTER TABLE public.services ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;

UPDATE public.services SET color = '#10B981' WHERE category = 'coupe' AND color IS NULL;
UPDATE public.services SET color = '#8B5CF6' WHERE category = 'coloration' AND color IS NULL;
UPDATE public.services SET color = '#8B5CF6' WHERE category = 'couleur' AND color IS NULL;
UPDATE public.services SET color = '#3B82F6' WHERE category = 'barbe' AND color IS NULL;
UPDATE public.services SET color = '#EC4899' WHERE category = 'soin' AND color IS NULL;
UPDATE public.services SET color = '#F97316' WHERE category = 'combo' AND color IS NULL;
UPDATE public.services SET color = '#6B7280' WHERE category = 'produit' AND color IS NULL;
UPDATE public.services SET color = '#6B7280' WHERE category = 'general' AND color IS NULL;
UPDATE public.services SET color = '#6B7280' WHERE color IS NULL;