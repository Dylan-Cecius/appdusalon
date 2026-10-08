-- V2: client erasure must go through erase_client_personal_data().
-- Direct DELETE could remove the client row without anonymising appointments,
-- SMS logs and activity metadata.

DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can manage clients in their salon" ON public.clients;
DROP POLICY IF EXISTS "Members can manage clients in accessible salon" ON public.clients;

-- SELECT / INSERT / UPDATE collaboration policies remain in place.
-- erase_client_personal_data(uuid) is SECURITY DEFINER and enforces salon admin.
