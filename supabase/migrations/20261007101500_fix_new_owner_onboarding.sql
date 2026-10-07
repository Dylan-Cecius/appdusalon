-- V2 onboarding: every new owner must receive a salon + admin role.
-- The historical trigger only created profiles, which leaves new signups
-- without a salon_id for the current RLS model.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_salon_id uuid;
  requested_salon_name text;
BEGIN
  requested_salon_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'salon_name', '')), '');

  INSERT INTO public.profiles (id, salon_name)
  VALUES (NEW.id, COALESCE(requested_salon_name, 'Mon Salon'))
  ON CONFLICT (id) DO NOTHING;

  SELECT id
  INTO new_salon_id
  FROM public.salons
  WHERE owner_user_id = NEW.id
  ORDER BY created_at
  LIMIT 1;

  IF new_salon_id IS NULL THEN
    INSERT INTO public.salons (owner_user_id, name)
    VALUES (NEW.id, COALESCE(requested_salon_name, 'Mon Salon'))
    RETURNING id INTO new_salon_id;
  END IF;

  INSERT INTO public.user_roles (user_id, salon_id, role)
  VALUES (NEW.id, new_salon_id, 'admin')
  ON CONFLICT (user_id, salon_id, role) DO NOTHING;

  INSERT INTO public.employees (
    salon_id,
    user_id,
    display_name,
    color,
    is_active
  )
  VALUES (
    new_salon_id,
    NEW.id,
    COALESCE(NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'display_name', '')), ''), 'Propriétaire'),
    'bg-purple-600',
    true
  )
  ON CONFLICT (salon_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
