-- V2: require AAL2 for application data access when the user has a verified MFA factor.
-- Accounts without MFA continue to work at AAL1. service_role remains trusted.

CREATE OR REPLACE FUNCTION public.mfa_session_is_sufficient()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, auth, public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_role text := auth.role();
  current_aal text := COALESCE(auth.jwt() ->> 'aal', 'aal1');
BEGIN
  IF current_role = 'service_role' THEN
    RETURN true;
  END IF;

  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.mfa_factors factors
    WHERE factors.user_id = current_user_id
      AND factors.status = 'verified'
  ) THEN
    RETURN true;
  END IF;

  RETURN current_aal = 'aal2';
END;
$$;

REVOKE ALL ON FUNCTION public.mfa_session_is_sufficient() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mfa_session_is_sufficient() TO authenticated, service_role;

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

  IF auth.role() <> 'service_role' AND NOT public.mfa_session_is_sufficient() THEN
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

CREATE OR REPLACE FUNCTION public.get_user_salon_id(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_salon_id uuid;
  membership_role public.app_role;
  owner_user_id_value uuid;
  owner_email text;
  subscriber_record record;
  normalized_tier text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.role() <> 'service_role' AND NOT public.mfa_session_is_sufficient() THEN
    RETURN NULL;
  END IF;

  IF auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NULL;
  END IF;

  SELECT roles.salon_id, roles.role
  INTO membership_salon_id, membership_role
  FROM public.user_roles roles
  WHERE roles.user_id = _user_id
  ORDER BY
    CASE WHEN roles.role = 'admin' THEN 0 ELSE 1 END,
    roles.created_at
  LIMIT 1;

  IF membership_salon_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF membership_role = 'admin' THEN
    RETURN membership_salon_id;
  END IF;

  IF membership_role <> 'employee' THEN
    RETURN NULL;
  END IF;

  SELECT salons.owner_user_id
  INTO owner_user_id_value
  FROM public.salons salons
  WHERE salons.id = membership_salon_id;

  IF owner_user_id_value IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT lower(users.email)
  INTO owner_email
  FROM auth.users users
  WHERE users.id = owner_user_id_value;

  IF owner_email IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.platform_admin_emails admins
    WHERE admins.email = owner_email
  ) THEN
    RETURN membership_salon_id;
  END IF;

  SELECT
    subscribers.subscribed,
    subscribers.subscription_tier,
    subscribers.subscription_end
  INTO subscriber_record
  FROM public.subscribers subscribers
  WHERE subscribers.user_id = owner_user_id_value
     OR (owner_email IS NOT NULL AND lower(subscribers.email) = owner_email)
  ORDER BY subscribers.updated_at DESC
  LIMIT 1;

  IF COALESCE(subscriber_record.subscribed, false) = false THEN
    RETURN NULL;
  END IF;

  IF subscriber_record.subscription_end IS NOT NULL
     AND subscriber_record.subscription_end <= now() THEN
    RETURN NULL;
  END IF;

  normalized_tier := CASE subscriber_record.subscription_tier
    WHEN 'Pro' THEN 'Equipe'
    WHEN 'Enterprise' THEN 'Lifetime'
    ELSE subscriber_record.subscription_tier
  END;

  IF normalized_tier IN ('Equipe', 'Lifetime') THEN
    RETURN membership_salon_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_employee_id(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.role() <> 'service_role' AND NOT public.mfa_session_is_sufficient() THEN
    RETURN NULL;
  END IF;

  IF auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT employees.id
    FROM public.employees
    WHERE employees.user_id = _user_id
      AND employees.is_active = true
    ORDER BY employees.created_at
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_salon(
  _user_id uuid,
  _salon_id uuid,
  _role public.app_role
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL OR _salon_id IS NULL OR _role IS NULL THEN
    RETURN false;
  END IF;

  IF auth.role() <> 'service_role' AND NOT public.mfa_session_is_sufficient() THEN
    RETURN false;
  END IF;

  IF auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles roles
    WHERE roles.user_id = _user_id
      AND roles.salon_id = _salon_id
      AND roles.role = _role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_salon_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.role() <> 'service_role' AND NOT public.mfa_session_is_sufficient() THEN
    RETURN false;
  END IF;

  IF auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles roles
    WHERE roles.user_id = _user_id
      AND roles.role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_owns_barber(
  target_barber_id uuid,
  target_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF target_barber_id IS NULL OR target_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.role() <> 'service_role' AND NOT public.mfa_session_is_sufficient() THEN
    RETURN false;
  END IF;

  IF auth.role() <> 'service_role'
     AND target_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.barbers
    WHERE id = target_barber_id
      AND user_id = target_user_id
      AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_barber_owner(target_barber_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
BEGIN
  IF target_barber_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.role() <> 'service_role' AND NOT public.mfa_session_is_sufficient() THEN
    RETURN NULL;
  END IF;

  SELECT barbers.user_id
  INTO owner_id
  FROM public.barbers
  WHERE barbers.id = target_barber_id
    AND barbers.is_active = true
  LIMIT 1;

  IF auth.role() = 'service_role' THEN
    RETURN owner_id;
  END IF;

  IF owner_id IS NOT DISTINCT FROM auth.uid() THEN
    RETURN owner_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.mfa_session_is_sufficient() THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.platform_admin_emails
    WHERE email = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_salon(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_salon_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_employee_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role_in_salon(uuid, uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_salon_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_owns_barber(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_barber_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_access_salon(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_salon_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_employee_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role_in_salon(uuid, uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_salon_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_barber(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_barber_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
