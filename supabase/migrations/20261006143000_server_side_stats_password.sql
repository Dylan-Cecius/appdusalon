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
