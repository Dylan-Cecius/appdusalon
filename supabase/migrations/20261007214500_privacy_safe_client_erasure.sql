-- V2: privacy-safe client erasure.
-- Personal data is removed while accounting transactions are preserved and unlinked.

CREATE OR REPLACE FUNCTION public.erase_client_personal_data(client_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  salon_id_value uuid;
  client_record public.clients%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT public.get_user_salon_id(current_user_id)
  INTO salon_id_value;

  IF salon_id_value IS NULL OR NOT public.is_salon_admin(current_user_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT *
  INTO client_record
  FROM public.clients
  WHERE id = client_id_param
    AND salon_id = salon_id_value
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'client_not_found';
  END IF;

  -- Preserve accounting records but remove the client relationship.
  UPDATE public.transactions
  SET client_id = NULL,
      updated_at = now()
  WHERE salon_id = salon_id_value
    AND client_id = client_record.id;

  -- Appointments historically identify clients by phone/name rather than client_id.
  UPDATE public.appointments
  SET client_name = 'Client supprimé',
      client_phone = 'SUPPRIME',
      notes = NULL,
      updated_at = now()
  WHERE salon_id = salon_id_value
    AND client_phone = client_record.phone;

  -- SMS logs contain phone numbers and sometimes message content with a first name.
  DELETE FROM public.sms_logs
  WHERE salon_id = salon_id_value
    AND (
      client_id = client_record.id
      OR phone_number = client_record.phone
    );

  -- Remove personal names from activity metadata when present.
  UPDATE public.activity_logs
  SET details = jsonb_set(
    COALESCE(details, '{}'::jsonb),
    '{client_name}',
    to_jsonb('Client supprimé'::text),
    true
  )
  WHERE salon_id = salon_id_value
    AND details ->> 'client_name' = client_record.name;

  DELETE FROM public.clients
  WHERE id = client_record.id
    AND salon_id = salon_id_value;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.erase_client_personal_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.erase_client_personal_data(uuid) TO authenticated;
