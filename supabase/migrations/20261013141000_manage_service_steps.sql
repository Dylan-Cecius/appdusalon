-- V2.1: atomically replace a service's multi-step schedule.

CREATE OR REPLACE FUNCTION public.replace_service_steps(
  target_service_id uuid,
  steps_payload jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_salon_id uuid;
  step_item jsonb;
  step_position integer := 0;
  inserted_count integer := 0;
  step_name text;
  step_type_value text;
  step_duration integer;
  step_customer_visible boolean;
BEGIN
  SELECT salon_id
  INTO target_salon_id
  FROM public.services
  WHERE id = target_service_id
    AND is_active = true;

  IF target_salon_id IS NULL THEN
    RAISE EXCEPTION 'service_not_found';
  END IF;

  IF auth.role() <> 'service_role'
     AND NOT public.has_role_in_salon(auth.uid(), target_salon_id, 'admin') THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  IF steps_payload IS NULL OR jsonb_typeof(steps_payload) <> 'array' THEN
    RAISE EXCEPTION 'invalid_steps_payload';
  END IF;

  IF jsonb_array_length(steps_payload) > 30 THEN
    RAISE EXCEPTION 'too_many_service_steps';
  END IF;

  DELETE FROM public.service_steps
  WHERE service_id = target_service_id;

  FOR step_item IN
    SELECT value
    FROM jsonb_array_elements(steps_payload)
  LOOP
    step_name := trim(COALESCE(step_item ->> 'name', ''));
    step_type_value := COALESCE(step_item ->> 'type', 'work');

    BEGIN
      step_duration := (step_item ->> 'duration')::integer;
    EXCEPTION WHEN invalid_text_representation OR null_value_not_allowed THEN
      RAISE EXCEPTION 'invalid_step_duration';
    END;

    step_customer_visible :=
      COALESCE((step_item ->> 'customer_visible')::boolean, step_type_value <> 'cleanup');

    IF char_length(step_name) < 1 OR char_length(step_name) > 100 THEN
      RAISE EXCEPTION 'invalid_step_name';
    END IF;

    IF step_type_value NOT IN ('work', 'pause', 'cleanup') THEN
      RAISE EXCEPTION 'invalid_step_type';
    END IF;

    IF step_duration < 1 OR step_duration > 480 THEN
      RAISE EXCEPTION 'invalid_step_duration';
    END IF;

    INSERT INTO public.service_steps (
      service_id,
      salon_id,
      position,
      name,
      step_type,
      duration_minutes,
      customer_visible
    )
    VALUES (
      target_service_id,
      target_salon_id,
      step_position,
      step_name,
      step_type_value,
      step_duration,
      step_customer_visible
    );

    step_position := step_position + 1;
    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_service_steps(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_service_steps(uuid, jsonb)
TO authenticated, service_role;
