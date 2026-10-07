-- V2: prevent authenticated callers from probing another user's salon access.

CREATE OR REPLACE FUNCTION public.can_access_salon(
  _user_id uuid,
  _salon_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_value public.app_role;
  owner_user_id_value uuid;
  owner_email_value text;
  subscriber_record record;
  normalized_tier text;
BEGIN
  IF _user_id IS NULL OR _salon_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  SELECT role
  INTO role_value
  FROM public.user_roles
  WHERE user_id = _user_id
    AND salon_id = _salon_id
  ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END
  LIMIT 1;

  IF role_value IS NULL THEN
    RETURN false;
  END IF;

  IF role_value = 'admin' THEN
    RETURN true;
  END IF;

  SELECT owner_user_id
  INTO owner_user_id_value
  FROM public.salons
  WHERE id = _salon_id;

  IF owner_user_id_value IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(email)
  INTO owner_email_value
  FROM auth.users
  WHERE id = owner_user_id_value;

  IF owner_email_value IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.platform_admin_emails
    WHERE email = owner_email_value
  ) THEN
    RETURN true;
  END IF;

  SELECT subscribed, subscription_tier, subscription_end
  INTO subscriber_record
  FROM public.subscribers
  WHERE user_id = owner_user_id_value
     OR (
       owner_email_value IS NOT NULL
       AND lower(email) = owner_email_value
     )
  ORDER BY updated_at DESC
  LIMIT 1;

  IF COALESCE(subscriber_record.subscribed, false) = false THEN
    RETURN false;
  END IF;

  IF subscriber_record.subscription_end IS NOT NULL
     AND subscriber_record.subscription_end <= now() THEN
    RETURN false;
  END IF;

  normalized_tier := CASE subscriber_record.subscription_tier
    WHEN 'Pro' THEN 'Equipe'
    WHEN 'Enterprise' THEN 'Lifetime'
    ELSE subscriber_record.subscription_tier
  END;

  RETURN normalized_tier IN ('Equipe', 'Lifetime');
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_salon(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_salon(uuid, uuid) TO authenticated, service_role;
