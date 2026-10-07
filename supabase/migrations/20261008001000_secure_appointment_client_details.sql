-- V2: make appointment client-detail RPC salon-aware and subscription-aware.

CREATE OR REPLACE FUNCTION public.get_appointment_client_details(appointment_id uuid)
RETURNS TABLE(client_name text, client_phone text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.client_name, a.client_phone
  FROM public.appointments a
  WHERE a.id = appointment_id
    AND a.salon_id = public.get_user_salon_id(auth.uid())
    AND public.can_access_salon(auth.uid(), a.salon_id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_appointment_client_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_appointment_client_details(uuid) TO authenticated;
