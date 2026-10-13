-- Preserve booked values and saved occupancy when moving an appointment.
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
  step_minutes integer;
BEGIN
  -- A move carries the booked snapshot; only a changed service selection is repriced.
  IF TG_OP = 'UPDATE' AND NEW.services IS NOT DISTINCT FROM OLD.services
     AND NEW.salon_id IS NOT DISTINCT FROM OLD.salon_id THEN
    NEW.total_price := OLD.total_price;
    NEW.end_time := NEW.start_time + (OLD.end_time - OLD.start_time);
    RETURN NEW;
  END IF;
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

    SELECT COALESCE(sum(duration_minutes), 0)::integer
    INTO step_minutes
    FROM public.service_steps
    WHERE service_id = service_record.id;

    IF step_minutes <= 0 THEN
      step_minutes := GREATEST(COALESCE(service_record.duration, 0), 0);
    END IF;

    calculated_total :=
      calculated_total + round(COALESCE(service_record.price, 0)::numeric, 2);

    total_minutes :=
      total_minutes
      + step_minutes
      + GREATEST(COALESCE(service_record.appointment_buffer, 0), 0);

    normalized_services := normalized_services || jsonb_build_array(
      jsonb_build_object(
        'id', service_record.id,
        'name', service_record.name,
        'price', round(COALESCE(service_record.price, 0)::numeric, 2),
        'duration', step_minutes,
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

CREATE OR REPLACE FUNCTION public.refresh_appointment_segments_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  snapshot_complete boolean;
  delta interval;
BEGIN
  IF TG_OP='UPDATE' AND OLD.status IN ('scheduled','pending_payment')
     AND NEW.status IN ('scheduled','pending_payment') AND NEW.staff_id IS NOT NULL
     AND NEW.services IS NOT DISTINCT FROM OLD.services AND NEW.salon_id=OLD.salon_id
     AND NEW.end_time-NEW.start_time=OLD.end_time-OLD.start_time THEN
    SELECT count(*)>0 AND min(starts_at)=OLD.start_time AND max(ends_at)=OLD.end_time
      AND bool_and(starts_at=COALESCE(previous_end,OLD.start_time))
      AND bool_and(salon_id=OLD.salon_id AND staff_id IS NOT DISTINCT FROM OLD.staff_id)
    INTO snapshot_complete FROM (
      SELECT *, lag(ends_at) OVER (ORDER BY position) AS previous_end
      FROM public.appointment_segments WHERE appointment_id=NEW.id
    ) segments;
    IF COALESCE(snapshot_complete,false) THEN
      delta := NEW.start_time-OLD.start_time;
      UPDATE public.appointment_segments SET starts_at=starts_at+delta, ends_at=ends_at+delta, staff_id=NEW.staff_id
        WHERE appointment_id=NEW.id;
    ELSE
      -- Never invent free processing from today's catalogue for an old booking.
      DELETE FROM public.appointment_segments WHERE appointment_id=NEW.id;
      INSERT INTO public.appointment_segments(appointment_id,salon_id,staff_id,position,segment_type,label,starts_at,ends_at,occupies_staff,customer_visible)
        VALUES(NEW.id,NEW.salon_id,NEW.staff_id,0,'block','Rendez-vous',NEW.start_time,NEW.end_time,true,false);
    END IF;
  ELSE
    PERFORM public.rebuild_appointment_segments(NEW.id);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.refresh_appointment_segments_trigger() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.validate_appointment_move() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  member public.staff%ROWTYPE;
  hours public.opening_hours%ROWTYPE;
  local_start timestamp; local_end timestamp; work jsonb; day_name text; lock_id uuid;
BEGIN
  IF NEW.start_time IS NOT DISTINCT FROM OLD.start_time AND NEW.end_time IS NOT DISTINCT FROM OLD.end_time
     AND NEW.staff_id IS NOT DISTINCT FROM OLD.staff_id THEN RETURN NEW; END IF;
  IF OLD.status NOT IN ('scheduled','pending_payment') OR NEW.status NOT IN ('scheduled','pending_payment') THEN
    RAISE EXCEPTION 'appointment_not_movable';
  END IF;
  IF NEW.services IS NOT DISTINCT FROM OLD.services AND NEW.end_time-NEW.start_time<>OLD.end_time-OLD.start_time THEN
    RAISE EXCEPTION 'invalid_appointment_duration';
  END IF;
  SELECT * INTO member FROM public.staff WHERE id=NEW.staff_id AND salon_id=NEW.salon_id AND is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_staff'; END IF;
  FOR lock_id IN SELECT DISTINCT value FROM unnest(ARRAY[OLD.staff_id,NEW.staff_id]) value WHERE value IS NOT NULL ORDER BY value LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(lock_id::text,0));
  END LOOP;
  local_start := NEW.start_time AT TIME ZONE 'Europe/Brussels';
  local_end := NEW.end_time AT TIME ZONE 'Europe/Brussels';
  IF local_start IS NULL OR local_end IS NULL OR local_end<=local_start OR local_start::date<>local_end::date THEN
    RAISE EXCEPTION 'invalid_appointment_time';
  END IF;
  SELECT * INTO hours FROM public.opening_hours WHERE salon_id=NEW.salon_id AND day_of_week=extract(isodow FROM local_start)::integer-1 FOR SHARE;
  IF NOT FOUND OR NOT hours.is_open OR local_start::time<hours.open_time::time OR local_end::time>hours.close_time::time
     OR (hours.break_start IS NOT NULL AND hours.break_end IS NOT NULL AND local_start::time<hours.break_end::time AND local_end::time>hours.break_start::time) THEN
    RAISE EXCEPTION 'outside_opening_hours';
  END IF;
  day_name := (ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'])[extract(isodow FROM local_start)::integer];
  work := member.daily_schedules->day_name;
  IF work IS NULL OR work->>'start' IS NULL OR work->>'end' IS NULL
     OR local_start::time<(work->>'start')::time OR local_end::time>(work->>'end')::time THEN
    RAISE EXCEPTION 'outside_staff_hours';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_appointment_move() FROM PUBLIC, anon, authenticated;
-- Runs after appointments_normalize_catalog_values, before occupancy/time-off checks.
CREATE TRIGGER appointments_validate_move BEFORE UPDATE OF start_time,end_time,staff_id ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_move();

