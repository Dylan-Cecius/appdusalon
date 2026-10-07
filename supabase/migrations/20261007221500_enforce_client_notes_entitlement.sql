-- V2: enforce paid access when creating or changing client notes.

CREATE OR REPLACE FUNCTION public.salon_can_use_full_client_notes(target_salon_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  salon_record record;
  owner_email text;
  subscriber_record record;
  normalized_tier text;
BEGIN
  SELECT owner_user_id, is_demo
  INTO salon_record
  FROM public.salons
  WHERE id = target_salon_id;

  IF salon_record.owner_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF COALESCE(salon_record.is_demo, false) THEN
    RETURN true;
  END IF;

  SELECT lower(email)
  INTO owner_email
  FROM auth.users
  WHERE id = salon_record.owner_user_id;

  IF owner_email IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.platform_admin_emails
    WHERE email = owner_email
  ) THEN
    RETURN true;
  END IF;

  SELECT subscribed, subscription_tier, subscription_end
  INTO subscriber_record
  FROM public.subscribers
  WHERE user_id = salon_record.owner_user_id
     OR (owner_email IS NOT NULL AND lower(email) = owner_email)
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

  RETURN normalized_tier IN ('Solo', 'Equipe', 'Lifetime');
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_client_notes_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  notes_changed boolean;
BEGIN
  notes_changed :=
    TG_OP = 'INSERT'
    OR NEW.notes IS DISTINCT FROM OLD.notes;

  IF notes_changed
     AND NULLIF(trim(COALESCE(NEW.notes, '')), '') IS NOT NULL
     AND NOT public.salon_can_use_full_client_notes(NEW.salon_id) THEN
    RAISE EXCEPTION 'client_notes_upgrade_required'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_enforce_notes_entitlement
  ON public.clients;

CREATE TRIGGER clients_enforce_notes_entitlement
BEFORE INSERT OR UPDATE OF notes
ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.enforce_client_notes_entitlement();
