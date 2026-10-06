-- V2: keep the section password hash server-side.
-- The browser can ask whether a password exists and can verify a candidate,
-- but never receives the stored hash.

CREATE OR REPLACE FUNCTION public.has_stats_password()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.salon_settings
    WHERE user_id = auth.uid()
      AND COALESCE(stats_password, '') <> ''
  );
$$;

CREATE OR REPLACE FUNCTION public.verify_stats_password(password_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  setting_id uuid;
  stored_password text;
  is_valid boolean := false;
BEGIN
  IF auth.uid() IS NULL OR password_text IS NULL THEN
    RETURN false;
  END IF;

  SELECT id, stats_password
  INTO setting_id, stored_password
  FROM public.salon_settings
  WHERE user_id = auth.uid()
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
    -- Legacy plaintext compatibility. A successful login immediately migrates it.
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


CREATE OR REPLACE FUNCTION public.set_stats_password(password_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user uuid := auth.uid();
  existing_id uuid;
BEGIN
  IF current_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF password_text IS NULL OR length(trim(password_text)) < 4 THEN
    RAISE EXCEPTION 'password_too_short';
  END IF;

  SELECT id
  INTO existing_id
  FROM public.salon_settings
  WHERE user_id = current_user
  ORDER BY updated_at DESC
  LIMIT 1;

  IF existing_id IS NULL THEN
    INSERT INTO public.salon_settings (user_id, name, stats_password)
    VALUES (current_user, 'L''app du salon', crypt(password_text, gen_salt('bf', 10)));
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.salon_settings
  SET stats_password = NULL,
      updated_at = now()
  WHERE id = (
    SELECT id
    FROM public.salon_settings
    WHERE user_id = auth.uid()
    ORDER BY updated_at DESC
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_stats_password(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_stats_password() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_stats_password(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_stats_password() TO authenticated;
