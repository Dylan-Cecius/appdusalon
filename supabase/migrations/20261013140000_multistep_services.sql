-- V2.1: multi-step services and appointment occupancy segments.
-- A "pause" step advances the client appointment without occupying the staff member.

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_id_salon_unique;

ALTER TABLE public.services
  ADD CONSTRAINT services_id_salon_unique UNIQUE (id, salon_id);

CREATE TABLE IF NOT EXISTS public.service_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL,
  salon_id uuid NOT NULL,
  position integer NOT NULL,
  name text NOT NULL,
  step_type text NOT NULL DEFAULT 'work',
  duration_minutes integer NOT NULL,
  customer_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_steps_service_salon_fk
    FOREIGN KEY (service_id, salon_id)
    REFERENCES public.services(id, salon_id)
    ON DELETE CASCADE,
  CONSTRAINT service_steps_position_unique UNIQUE (service_id, position),
  CONSTRAINT service_steps_position_check CHECK (position >= 0),
  CONSTRAINT service_steps_type_check
    CHECK (step_type IN ('work', 'pause', 'cleanup')),
  CONSTRAINT service_steps_duration_check
    CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  CONSTRAINT service_steps_name_check
    CHECK (char_length(trim(name)) BETWEEN 1 AND 100)
);

ALTER TABLE public.service_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon members can view service steps" ON public.service_steps;
CREATE POLICY "Salon members can view service steps"
ON public.service_steps
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

DROP POLICY IF EXISTS "Salon admins can create service steps" ON public.service_steps;
CREATE POLICY "Salon admins can create service steps"
ON public.service_steps
FOR INSERT
TO authenticated
WITH CHECK (public.has_role_in_salon(auth.uid(), salon_id, 'admin'));

DROP POLICY IF EXISTS "Salon admins can update service steps" ON public.service_steps;
CREATE POLICY "Salon admins can update service steps"
ON public.service_steps
FOR UPDATE
TO authenticated
USING (public.has_role_in_salon(auth.uid(), salon_id, 'admin'))
WITH CHECK (public.has_role_in_salon(auth.uid(), salon_id, 'admin'));

DROP POLICY IF EXISTS "Salon admins can delete service steps" ON public.service_steps;
CREATE POLICY "Salon admins can delete service steps"
ON public.service_steps
FOR DELETE
TO authenticated
USING (public.has_role_in_salon(auth.uid(), salon_id, 'admin'));

CREATE INDEX IF NOT EXISTS service_steps_service_position_idx
  ON public.service_steps (service_id, position);

DROP TRIGGER IF EXISTS service_steps_set_updated_at ON public.service_steps;
CREATE TRIGGER service_steps_set_updated_at
BEFORE UPDATE ON public.service_steps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_service_duration_from_steps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_service_id uuid;
  step_total integer;
BEGIN
  target_service_id :=
    CASE WHEN TG_OP = 'DELETE' THEN OLD.service_id ELSE NEW.service_id END;
  SELECT COALESCE(sum(duration_minutes), 0)::integer
  INTO step_total
  FROM public.service_steps
  WHERE service_id = target_service_id;

  IF step_total > 0 THEN
    UPDATE public.services
    SET duration = step_total
    WHERE id = target_service_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$;

REVOKE ALL ON FUNCTION public.sync_service_duration_from_steps() FROM PUBLIC;

DROP TRIGGER IF EXISTS service_steps_sync_service_duration
  ON public.service_steps;

CREATE TRIGGER service_steps_sync_service_duration
AFTER INSERT OR UPDATE OF duration_minutes OR DELETE
ON public.service_steps
FOR EACH ROW
EXECUTE FUNCTION public.sync_service_duration_from_steps();

CREATE TABLE IF NOT EXISTS public.appointment_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_step_id uuid REFERENCES public.service_steps(id) ON DELETE SET NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  position integer NOT NULL,
  segment_type text NOT NULL,
  label text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  occupies_staff boolean NOT NULL DEFAULT true,
  customer_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_segments_position_unique UNIQUE (appointment_id, position),
  CONSTRAINT appointment_segments_type_check
    CHECK (segment_type IN ('work', 'pause', 'cleanup', 'block')),
  CONSTRAINT appointment_segments_time_check CHECK (ends_at > starts_at)
);

ALTER TABLE public.appointment_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon members can view appointment segments" ON public.appointment_segments;
CREATE POLICY "Salon members can view appointment segments"
ON public.appointment_segments
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

CREATE INDEX IF NOT EXISTS appointment_segments_staff_time_idx
  ON public.appointment_segments (staff_id, starts_at, ends_at)
  WHERE occupies_staff = true;

CREATE INDEX IF NOT EXISTS appointment_segments_appointment_idx
  ON public.appointment_segments (appointment_id, position);

CREATE OR REPLACE FUNCTION public.prevent_appointment_segment_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_id IS NULL OR NEW.occupies_staff = false THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.staff_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.appointment_segments existing
    WHERE existing.staff_id = NEW.staff_id
      AND existing.occupies_staff = true
      AND existing.appointment_id IS DISTINCT FROM NEW.appointment_id
      AND existing.starts_at < NEW.ends_at
      AND existing.ends_at > NEW.starts_at
  ) THEN
    RAISE EXCEPTION 'appointment_conflict'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointment_segments_prevent_overlap
  ON public.appointment_segments;

CREATE TRIGGER appointment_segments_prevent_overlap
BEFORE INSERT OR UPDATE OF staff_id, starts_at, ends_at, occupies_staff
ON public.appointment_segments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_appointment_segment_overlap();

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

CREATE OR REPLACE FUNCTION public.rebuild_appointment_segments(
  target_appointment_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  appointment_record public.appointments%ROWTYPE;
  service_item jsonb;
  service_id_value uuid;
  service_record public.services%ROWTYPE;
  step_record public.service_steps%ROWTYPE;
  cursor_time timestamptz;
  segment_end timestamptz;
  segment_position integer := 0;
  inserted_count integer := 0;
  has_steps boolean;
BEGIN
  SELECT *
  INTO appointment_record
  FROM public.appointments
  WHERE id = target_appointment_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  DELETE FROM public.appointment_segments
  WHERE appointment_id = target_appointment_id;

  IF appointment_record.staff_id IS NULL
     OR appointment_record.status NOT IN ('scheduled', 'pending_payment') THEN
    RETURN 0;
  END IF;

  cursor_time := appointment_record.start_time;

  IF appointment_record.services IS NULL
     OR jsonb_typeof(appointment_record.services) <> 'array'
     OR jsonb_array_length(appointment_record.services) = 0 THEN
    INSERT INTO public.appointment_segments (
      appointment_id,
      salon_id,
      staff_id,
      position,
      segment_type,
      label,
      starts_at,
      ends_at,
      occupies_staff,
      customer_visible
    )
    VALUES (
      appointment_record.id,
      appointment_record.salon_id,
      appointment_record.staff_id,
      0,
      'block',
      appointment_record.client_name,
      appointment_record.start_time,
      appointment_record.end_time,
      true,
      false
    );

    RETURN 1;
  END IF;

  FOR service_item IN
    SELECT value
    FROM jsonb_array_elements(appointment_record.services)
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
      AND salon_id = appointment_record.salon_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'service_not_found';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.service_steps
      WHERE service_id = service_record.id
    )
    INTO has_steps;

    IF has_steps THEN
      FOR step_record IN
        SELECT *
        FROM public.service_steps
        WHERE service_id = service_record.id
        ORDER BY position
      LOOP
        segment_end :=
          cursor_time + make_interval(mins => step_record.duration_minutes);

        INSERT INTO public.appointment_segments (
          appointment_id,
          salon_id,
          service_id,
          service_step_id,
          staff_id,
          position,
          segment_type,
          label,
          starts_at,
          ends_at,
          occupies_staff,
          customer_visible
        )
        VALUES (
          appointment_record.id,
          appointment_record.salon_id,
          service_record.id,
          step_record.id,
          appointment_record.staff_id,
          segment_position,
          step_record.step_type,
          step_record.name,
          cursor_time,
          segment_end,
          step_record.step_type <> 'pause',
          step_record.customer_visible
        );

        cursor_time := segment_end;
        segment_position := segment_position + 1;
        inserted_count := inserted_count + 1;
      END LOOP;
    ELSE
      segment_end :=
        cursor_time + make_interval(mins => GREATEST(service_record.duration, 1));

      INSERT INTO public.appointment_segments (
        appointment_id,
        salon_id,
        service_id,
        staff_id,
        position,
        segment_type,
        label,
        starts_at,
        ends_at,
        occupies_staff,
        customer_visible
      )
      VALUES (
        appointment_record.id,
        appointment_record.salon_id,
        service_record.id,
        appointment_record.staff_id,
        segment_position,
        'work',
        service_record.name,
        cursor_time,
        segment_end,
        true,
        true
      );

      cursor_time := segment_end;
      segment_position := segment_position + 1;
      inserted_count := inserted_count + 1;
    END IF;

    IF COALESCE(service_record.appointment_buffer, 0) > 0 THEN
      segment_end :=
        cursor_time
        + make_interval(mins => GREATEST(service_record.appointment_buffer, 0));

      INSERT INTO public.appointment_segments (
        appointment_id,
        salon_id,
        service_id,
        staff_id,
        position,
        segment_type,
        label,
        starts_at,
        ends_at,
        occupies_staff,
        customer_visible
      )
      VALUES (
        appointment_record.id,
        appointment_record.salon_id,
        service_record.id,
        appointment_record.staff_id,
        segment_position,
        'cleanup',
        'Préparation / nettoyage',
        cursor_time,
        segment_end,
        true,
        false
      );

      cursor_time := segment_end;
      segment_position := segment_position + 1;
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_appointment_segments(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rebuild_appointment_segments(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_appointment_segments(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_appointment_segments_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.rebuild_appointment_segments(NEW.id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_appointment_segments_trigger() FROM PUBLIC;

DROP TRIGGER IF EXISTS appointments_refresh_segments
  ON public.appointments;

CREATE TRIGGER appointments_refresh_segments
AFTER INSERT OR UPDATE OF services, start_time, end_time, staff_id, status
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.refresh_appointment_segments_trigger();

-- Backfill segments while the legacy whole-appointment overlap guard is still active.
DO $$
DECLARE
  appointment_row record;
BEGIN
  FOR appointment_row IN
    SELECT id
    FROM public.appointments
    WHERE staff_id IS NOT NULL
      AND status IN ('scheduled', 'pending_payment')
    ORDER BY start_time
  LOOP
    PERFORM public.rebuild_appointment_segments(appointment_row.id);
  END LOOP;
END
$$;

-- Segment-level overlap is now authoritative and permits genuine pause windows.
DROP TRIGGER IF EXISTS appointments_prevent_staff_overlap
  ON public.appointments;
