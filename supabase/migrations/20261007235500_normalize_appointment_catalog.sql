-- V2: canonicalize appointment services, prices and duration server-side.
-- Empty-service appointments are allowed for internal calendar blocks.

CREATE OR REPLACE FUNCTION public.normalize_appointment_catalog_values()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  service_item jsonb;
  service_id_value uuid;
  service_record public.services%ROWTYPE;
  normalized_services jsonb := '[]'::jsonb;
  calculated_total numeric(12,2) := 0;
  total_minutes integer := 0;
BEGIN
  IF NEW.salon_id IS NULL THEN
    RAISE EXCEPTION 'salon_required';
  END IF;

  IF NEW.services IS NULL
     OR jsonb_typeof(NEW.services) <> 'array'
     OR jsonb_array_length(NEW.services) = 0 THEN
    NEW.services := '[]'::jsonb;
    NEW.total_price := 0;
    RETURN NEW;
  END IF;

  FOR service_item IN
    SELECT value
    FROM jsonb_array_elements(NEW.services)
  LOOP
    BEGIN
      service_id_value := (service_item ->> 'id')::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid_service_id';
    END;

    SELECT *
    INTO service_record
    FROM public.services
    WHERE id = service_id_value
      AND salon_id = NEW.salon_id
      AND is_active = true
      AND lower(COALESCE(category, '')) <> 'produit';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'service_not_found';
    END IF;

    calculated_total :=
      calculated_total + round(COALESCE(service_record.price, 0)::numeric, 2);

    total_minutes :=
      total_minutes
      + GREATEST(COALESCE(service_record.duration, 0), 0)
      + GREATEST(COALESCE(service_record.appointment_buffer, 0), 0);

    normalized_services := normalized_services || jsonb_build_array(
      jsonb_build_object(
        'id', service_record.id,
        'name', service_record.name,
        'price', round(COALESCE(service_record.price, 0)::numeric, 2),
        'duration', COALESCE(service_record.duration, 0),
        'appointmentBuffer', COALESCE(service_record.appointment_buffer, 0),
        'category', service_record.category
      )
    );
  END LOOP;

  IF total_minutes <= 0 THEN
    RAISE EXCEPTION 'invalid_service_duration';
  END IF;

  NEW.services := normalized_services;
  NEW.total_price := round(calculated_total, 2);
  NEW.end_time := NEW.start_time + make_interval(mins => total_minutes);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_normalize_catalog_values
  ON public.appointments;

CREATE TRIGGER appointments_normalize_catalog_values
BEFORE INSERT OR UPDATE OF services, start_time, salon_id
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.normalize_appointment_catalog_values();
