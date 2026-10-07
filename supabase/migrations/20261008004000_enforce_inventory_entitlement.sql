-- V2: enforce inventory-management entitlement server-side.
-- Direct catalog/stock writes require Equipe/Lifetime. POS SECURITY DEFINER
-- functions may still adjust stock as part of a legitimate sale.

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

REVOKE ALL ON FUNCTION public.salon_can_manage_inventory(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_can_manage_inventory(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

CREATE POLICY "Entitled admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
)
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);

DROP POLICY IF EXISTS "Admins can insert stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins can update stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins can delete stock movements" ON public.stock_movements;

CREATE POLICY "Entitled admins can insert stock movements"
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled admins can update stock movements"
ON public.stock_movements
FOR UPDATE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
)
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled admins can delete stock movements"
ON public.stock_movements
FOR DELETE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);
