-- V2: align client RLS with the UI.
-- Team members may read/create/update client records; permanent deletion is admin-only.

DROP POLICY IF EXISTS "Members can manage clients in accessible salon" ON public.clients;

CREATE POLICY "Members can view clients in accessible salon"
ON public.clients
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

CREATE POLICY "Members can create clients in accessible salon"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_salon(auth.uid(), salon_id));

CREATE POLICY "Members can update clients in accessible salon"
ON public.clients
FOR UPDATE
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id))
WITH CHECK (public.can_access_salon(auth.uid(), salon_id));

CREATE POLICY "Admins can delete clients"
ON public.clients
FOR DELETE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);
