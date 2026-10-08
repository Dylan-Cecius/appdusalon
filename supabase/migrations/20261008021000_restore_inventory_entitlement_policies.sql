-- V2: final inventory policies must preserve both salon membership and paid entitlement.
-- A later admin-write migration accidentally reintroduced broad member SELECT policies.
-- Keep the trigger protection for writes and restore RLS defense-in-depth.

DROP POLICY IF EXISTS "Members can view products" ON public.products;
DROP POLICY IF EXISTS "Entitled members can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Entitled admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Entitled admins can update products" ON public.products;
DROP POLICY IF EXISTS "Entitled admins can delete products" ON public.products;

CREATE POLICY "Entitled members can view products"
ON public.products
FOR SELECT
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
)
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);

DROP POLICY IF EXISTS "Members can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Entitled members can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins can insert stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins can update stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins can delete stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Entitled admins can insert stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Entitled admins can update stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Entitled admins can delete stock movements" ON public.stock_movements;

CREATE POLICY "Entitled members can view stock movements"
ON public.stock_movements
FOR SELECT
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled admins can insert stock movements"
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled admins can update stock movements"
ON public.stock_movements
FOR UPDATE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
)
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);

CREATE POLICY "Entitled admins can delete stock movements"
ON public.stock_movements
FOR DELETE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
  AND public.salon_can_manage_inventory(salon_id)
);
