-- V2: require active salon access for statistics password checks.

CREATE OR REPLACE FUNCTION public.has_stats_password()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_salon_id uuid;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  current_salon_id := public.get_user_salon_id(current_user_id);

  IF current_salon_id IS NULL
     OR NOT public.can_access_salon(current_user_id, current_salon_id) THEN
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
  current_user_id uuid := auth.uid();
  current_salon_id uuid;
  setting_id uuid;
  stored_password text;
  is_valid boolean := false;
BEGIN
  IF current_user_id IS NULL OR password_text IS NULL THEN
    RETURN false;
  END IF;

  current_salon_id := public.get_user_salon_id(current_user_id);

  IF current_salon_id IS NULL
     OR NOT public.can_access_salon(current_user_id, current_salon_id) THEN
    RETURN false;
  END IF;

  SELECT id, stats_password
  INTO setting_id, stored_password
  FROM public.salon_settings
  WHERE salon_id = current_salon_id
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

REVOKE ALL ON FUNCTION public.has_stats_password() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_stats_password(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_stats_password() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_stats_password(text) TO authenticated;
