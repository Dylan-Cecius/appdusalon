-- V2: close the remaining legacy identity/ownership probing helpers.

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

REVOKE ALL ON FUNCTION public.is_salon_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.user_owns_barber(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_barber_owner(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_salon_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_barber(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_barber_owner(uuid) TO authenticated, service_role;
