-- V2: serialize appointment writes per staff member and reject overlaps.
-- Prevents two concurrent booking requests from reserving the same slot.

CREATE OR REPLACE FUNCTION public.prevent_staff_appointment_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_id IS NULL OR NEW.status <> 'scheduled' THEN
    RETURN NEW;
  END IF;

  -- Serialize concurrent writes for the same staff member within the transaction.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.staff_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.appointments existing
    WHERE existing.staff_id = NEW.staff_id
      AND existing.status = 'scheduled'
      AND existing.id IS DISTINCT FROM NEW.id
      AND existing.start_time < NEW.end_time
      AND existing.end_time > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'appointment_conflict'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_prevent_staff_overlap
  ON public.appointments;

CREATE TRIGGER appointments_prevent_staff_overlap
BEFORE INSERT OR UPDATE OF staff_id, start_time, end_time, status
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_staff_appointment_overlap();
