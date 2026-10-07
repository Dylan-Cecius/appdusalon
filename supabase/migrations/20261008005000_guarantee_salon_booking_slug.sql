-- V2: guarantee every salon has a stable public booking slug.

DO $$
DECLARE
  salon_record record;
  base_slug text;
BEGIN
  FOR salon_record IN
    SELECT id, name
    FROM public.salons
    WHERE slug IS NULL OR trim(slug) = ''
  LOOP
    base_slug := trim(both '-' from regexp_replace(
      lower(COALESCE(salon_record.name, 'salon')),
      '[^a-z0-9]+',
      '-',
      'g'
    ));

    IF base_slug = '' THEN
      base_slug := 'salon';
    END IF;

    UPDATE public.salons
    SET slug = base_slug || '-' || left(salon_record.id::text, 8)
    WHERE id = salon_record.id;
  END LOOP;
END
$$;

ALTER TABLE public.salons
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS salons_slug_unique
  ON public.salons (slug);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_salon_name text;
  account_type text;
  new_salon_id uuid;
  base_slug text;
BEGIN
  requested_salon_name := NULLIF(
    trim(
      COALESCE(
        NEW.raw_user_meta_data ->> 'salon_name',
        NEW.raw_user_meta_data ->> 'display_name',
        ''
      )
    ),
    ''
  );

  account_type := lower(COALESCE(NEW.raw_user_meta_data ->> 'account_type', ''));

  INSERT INTO public.profiles (id, salon_name)
  VALUES (NEW.id, COALESCE(requested_salon_name, 'Mon Salon'))
  ON CONFLICT (id)
  DO UPDATE SET
    salon_name = COALESCE(EXCLUDED.salon_name, public.profiles.salon_name),
    updated_at = now();

  IF account_type = 'employee' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = NEW.id
  ) OR EXISTS (
    SELECT 1
    FROM public.salons
    WHERE owner_user_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  new_salon_id := gen_random_uuid();

  base_slug := trim(both '-' from regexp_replace(
    lower(COALESCE(requested_salon_name, 'salon')),
    '[^a-z0-9]+',
    '-',
    'g'
  ));

  IF base_slug = '' THEN
    base_slug := 'salon';
  END IF;

  INSERT INTO public.salons (
    id,
    owner_user_id,
    name,
    slug
  )
  VALUES (
    new_salon_id,
    NEW.id,
    COALESCE(requested_salon_name, 'Mon Salon'),
    base_slug || '-' || left(new_salon_id::text, 8)
  );

  INSERT INTO public.user_roles (
    user_id,
    salon_id,
    role
  )
  VALUES (
    NEW.id,
    new_salon_id,
    'admin'
  );

  RETURN NEW;
END;
$$;
