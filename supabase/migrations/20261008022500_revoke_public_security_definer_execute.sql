-- V2: SECURITY DEFINER functions must never retain PostgreSQL's default
-- EXECUTE privilege for PUBLIC. Grant only to application roles that need them.

REVOKE ALL ON FUNCTION public.user_owns_barber(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_owns_barber(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_barber_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_barber_owner(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.hash_password(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hash_password(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.verify_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_password(text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.salon_can_use_full_client_notes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_can_use_full_client_notes(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calculate_next_send_date(text, time without time zone, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_next_send_date(text, time without time zone, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calculate_next_send_date(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_next_send_date(text, text, integer, integer) TO authenticated, service_role;

-- Trigger helpers do not need to be callable directly by clients.
REVOKE ALL ON FUNCTION public.set_next_send_date() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.set_next_send_date() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated, service_role;
