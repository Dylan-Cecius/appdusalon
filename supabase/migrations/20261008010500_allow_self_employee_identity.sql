-- V2: allow an authenticated employee to resolve their own employee identity
-- even while the salon subscription state is being refreshed. Business data
-- remains protected by can_access_salon.

DROP POLICY IF EXISTS "Members can view employees in accessible salon" ON public.employees;

CREATE POLICY "Members can view permitted employee identities"
ON public.employees
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.can_access_salon(auth.uid(), salon_id)
);
