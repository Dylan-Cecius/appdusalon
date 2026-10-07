-- V2: employee application access is a paid Equipe/Lifetime capability.
-- Owners/admins keep access to their own salon regardless of paid plan.

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
