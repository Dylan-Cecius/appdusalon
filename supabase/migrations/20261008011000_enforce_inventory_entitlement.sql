-- V2: enforce inventory entitlement server-side for product and stock writes.

CREATE OR REPLACE FUNCTION public.salon_can_manage_inventory(target_salon_id uuid)
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

  RETURN normalized_tier IN ('Equipe', 'Lifetime');
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_inventory_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target_salon_id uuid;
BEGIN
  target_salon_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.salon_id
    ELSE NEW.salon_id
  END;

  IF NOT public.salon_can_manage_inventory(target_salon_id) THEN
    RAISE EXCEPTION 'inventory_upgrade_required'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_enforce_inventory_entitlement
  ON public.products;

CREATE TRIGGER products_enforce_inventory_entitlement
BEFORE INSERT OR UPDATE OR DELETE
ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.enforce_inventory_entitlement();

DROP TRIGGER IF EXISTS stock_movements_enforce_inventory_entitlement
  ON public.stock_movements;

CREATE TRIGGER stock_movements_enforce_inventory_entitlement
BEFORE INSERT OR UPDATE OR DELETE
ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION public.enforce_inventory_entitlement();
