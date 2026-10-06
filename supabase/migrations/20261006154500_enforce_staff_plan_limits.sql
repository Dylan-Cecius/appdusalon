-- V2: enforce team-size limits server-side.

CREATE OR REPLACE FUNCTION public.enforce_staff_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  owner_email text;
  tier text;
  is_subscribed boolean := false;
  subscription_end timestamptz;
  max_staff integer := 1;
  active_count integer := 0;
  platform_admin boolean := false;
BEGIN
  IF COALESCE(NEW.is_active, true) = false THEN
    RETURN NEW;
  END IF;

  SELECT owner_user_id
  INTO owner_id
  FROM public.salons
  WHERE id = NEW.salon_id;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'salon_owner_not_found';
  END IF;

  SELECT lower(email)
  INTO owner_email
  FROM auth.users
  WHERE id = owner_id;

  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admin_emails
    WHERE email = owner_email
  )
  INTO platform_admin;

  IF platform_admin THEN
    RETURN NEW;
  END IF;

  SELECT
    subscribed,
    subscription_tier,
    subscription_end
  INTO
    is_subscribed,
    tier,
    subscription_end
  FROM public.subscribers
  WHERE user_id = owner_id OR lower(email) = owner_email
  ORDER BY updated_at DESC
  LIMIT 1;

  IF is_subscribed IS DISTINCT FROM true THEN
    max_staff := 1;
  ELSIF tier IN ('Lifetime', 'Enterprise') THEN
    RETURN NEW;
  ELSIF tier IN ('Equipe', 'Pro')
        AND (subscription_end IS NULL OR subscription_end > now()) THEN
    max_staff := 5;
  ELSE
    max_staff := 1;
  END IF;

  SELECT count(*)
  INTO active_count
  FROM public.staff
  WHERE salon_id = NEW.salon_id
    AND is_active = true
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF active_count >= max_staff THEN
    RAISE EXCEPTION 'staff_plan_limit_reached:%', max_staff
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_staff_plan_limit_trigger ON public.staff;

CREATE TRIGGER enforce_staff_plan_limit_trigger
BEFORE INSERT OR UPDATE OF is_active, salon_id
ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.enforce_staff_plan_limit();

REVOKE ALL ON FUNCTION public.enforce_staff_plan_limit() FROM PUBLIC;
