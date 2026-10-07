-- V2: scope salon settings and statistics password to the salon, not the user.
-- This makes the protection consistent for owners and employees.

ALTER TABLE public.salon_settings
  ADD COLUMN IF NOT EXISTS salon_id uuid REFERENCES public.salons(id) ON DELETE CASCADE;

-- Prefer the actual salon owner for existing settings.
UPDATE public.salon_settings settings
SET salon_id = salons.id
FROM public.salons salons
WHERE settings.salon_id IS NULL
  AND settings.user_id = salons.owner_user_id;

-- Compatibility fallback for rows historically written by another salon member.
UPDATE public.salon_settings settings
SET salon_id = roles.salon_id
FROM public.user_roles roles
WHERE settings.salon_id IS NULL
  AND settings.user_id = roles.user_id;

-- Keep the newest settings row if legacy data contains duplicates for one salon.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY salon_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS row_number
  FROM public.salon_settings
  WHERE salon_id IS NOT NULL
)
DELETE FROM public.salon_settings
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS salon_settings_salon_id_unique
  ON public.salon_settings (salon_id)
  WHERE salon_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view their own salon settings" ON public.salon_settings;
DROP POLICY IF EXISTS "Users can update their own salon settings" ON public.salon_settings;
DROP POLICY IF EXISTS "Users can insert their own salon settings" ON public.salon_settings;
DROP POLICY IF EXISTS "Members can view salon settings" ON public.salon_settings;
DROP POLICY IF EXISTS "Admins can insert salon settings" ON public.salon_settings;
DROP POLICY IF EXISTS "Admins can update salon settings" ON public.salon_settings;
DROP POLICY IF EXISTS "Admins can delete salon settings" ON public.salon_settings;

CREATE POLICY "Members can view salon settings"
ON public.salon_settings
FOR SELECT
TO authenticated
USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Admins can insert salon settings"
ON public.salon_settings
FOR INSERT
TO authenticated
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can update salon settings"
ON public.salon_settings
FOR UPDATE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
)
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can delete salon settings"
ON public.salon_settings
FOR DELETE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE OR REPLACE FUNCTION public.has_stats_password()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_salon_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  current_salon_id := public.get_user_salon_id(auth.uid());
  IF current_salon_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.salon_settings
    WHERE salon_id = current_salon_id
      AND COALESCE(stats_password, '') <> ''
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_stats_password(password_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_salon_id uuid;
  setting_id uuid;
  stored_password text;
  is_valid boolean := false;
BEGIN
  IF auth.uid() IS NULL OR password_text IS NULL THEN
    RETURN false;
  END IF;

  current_salon_id := public.get_user_salon_id(auth.uid());
  IF current_salon_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT id, stats_password
  INTO setting_id, stored_password
  FROM public.salon_settings
  WHERE salon_id = current_salon_id
  ORDER BY updated_at DESC
  LIMIT 1;

  IF stored_password IS NULL OR stored_password = '' THEN
    RETURN false;
  END IF;

  IF stored_password LIKE '$2%' THEN
    is_valid := stored_password = crypt(password_text, stored_password);
  ELSIF stored_password ~ '^[a-f0-9]{32}$' THEN
    is_valid := stored_password = md5(password_text || 'salon_salt_2024');
  ELSE
    is_valid := stored_password = password_text;
  END IF;

  IF is_valid AND stored_password NOT LIKE '$2%' THEN
    UPDATE public.salon_settings
    SET stats_password = crypt(password_text, gen_salt('bf', 10)),
        updated_at = now()
    WHERE id = setting_id;
  END IF;

  RETURN is_valid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_stats_password(password_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_salon_id uuid;
  salon_owner_id uuid;
  salon_name text;
  existing_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF password_text IS NULL OR length(trim(password_text)) < 4 THEN
    RAISE EXCEPTION 'password_too_short';
  END IF;

  current_salon_id := public.get_user_salon_id(current_user_id);

  IF current_salon_id IS NULL
     OR NOT public.has_role_in_salon(current_user_id, current_salon_id, 'admin') THEN
    RAISE EXCEPTION 'admin_required'
      USING ERRCODE = '42501';
  END IF;

  SELECT owner_user_id, name
  INTO salon_owner_id, salon_name
  FROM public.salons
  WHERE id = current_salon_id;

  SELECT id
  INTO existing_id
  FROM public.salon_settings
  WHERE salon_id = current_salon_id
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO public.salon_settings (
      salon_id,
      user_id,
      name,
      stats_password
    )
    VALUES (
      current_salon_id,
      salon_owner_id,
      COALESCE(salon_name, 'L''App du Salon'),
      crypt(password_text, gen_salt('bf', 10))
    );
  ELSE
    UPDATE public.salon_settings
    SET stats_password = crypt(password_text, gen_salt('bf', 10)),
        updated_at = now()
    WHERE id = existing_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_stats_password()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_salon_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  current_salon_id := public.get_user_salon_id(current_user_id);

  IF current_salon_id IS NULL
     OR NOT public.has_role_in_salon(current_user_id, current_salon_id, 'admin') THEN
    RAISE EXCEPTION 'admin_required'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.salon_settings
  SET stats_password = NULL,
      updated_at = now()
  WHERE salon_id = current_salon_id;
END;
$$;

REVOKE ALL ON FUNCTION public.has_stats_password() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_stats_password(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_stats_password(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_stats_password() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_stats_password() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_stats_password(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_stats_password(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_stats_password() TO authenticated;
