-- V2: salon members may read inventory, but only admins manage it directly.
-- POS sales remain available to employees through SECURITY DEFINER RPCs.

DROP POLICY IF EXISTS "products_salon_access" ON public.products;
DROP POLICY IF EXISTS "stock_movements_salon_access" ON public.stock_movements;
DROP POLICY IF EXISTS "Members can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Members can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins can insert stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins can update stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admins can delete stock movements" ON public.stock_movements;

CREATE POLICY "Members can view products"
ON public.products
FOR SELECT
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
);

CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
)
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Members can view stock movements"
ON public.stock_movements
FOR SELECT
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
);

CREATE POLICY "Admins can insert stock movements"
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can update stock movements"
ON public.stock_movements
FOR UPDATE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
)
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can delete stock movements"
ON public.stock_movements
FOR DELETE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);
