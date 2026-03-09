ALTER TABLE public.salons ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS salons_slug_unique ON public.salons (slug);