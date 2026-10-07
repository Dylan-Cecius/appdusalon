-- V2: harden identity helper RPCs against arbitrary user-id probing.
-- Authenticated browser callers may only resolve their own identity.
-- service_role keeps server-side ability to resolve another user when required.

CREATE OR REPLACE FUNCTION public.get_user_salon_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT salon_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND (
      auth.role() = 'service_role'
      OR _user_id = auth.uid()
    )
  ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_employee_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.employees
  WHERE user_id = _user_id
    AND is_active = true
    AND (
      auth.role() = 'service_role'
      OR _user_id = auth.uid()
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_role_in_salon(
  _user_id uuid,
  _salon_id uuid,
  _role public.app_role
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND salon_id = _salon_id
      AND role = _role
      AND (
        auth.role() = 'service_role'
        OR _user_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_salon_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND (
        auth.role() = 'service_role'
        OR _user_id = auth.uid()
      )
  );
$$;

REVOKE ALL ON FUNCTION public.get_user_salon_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_employee_id(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role_in_salon(uuid, uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_salon_admin(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_salon_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_employee_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role_in_salon(uuid, uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_salon_admin(uuid) TO authenticated, service_role;
