-- V2.1: automatic booking waitlist.
-- Public clients join through a validated Edge Function; salon members manage entries through RLS.

CREATE TABLE IF NOT EXISTS public.booking_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  preferred_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  preferred_date_from date NOT NULL,
  preferred_date_to date NOT NULL,
  preferred_time_start time,
  preferred_time_end time,
  status text NOT NULL DEFAULT 'active',
  notification_count integer NOT NULL DEFAULT 0,
  last_notified_at timestamptz,
  offer_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_waitlist_status_check
    CHECK (status IN ('active', 'notified', 'booked', 'cancelled', 'expired')),
  CONSTRAINT booking_waitlist_date_range_check
    CHECK (preferred_date_to >= preferred_date_from),
  CONSTRAINT booking_waitlist_time_range_check
    CHECK (
      preferred_time_start IS NULL
      OR preferred_time_end IS NULL
      OR preferred_time_end > preferred_time_start
    ),
  CONSTRAINT booking_waitlist_notification_count_check
    CHECK (notification_count >= 0)
);

ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Salon members can view booking waitlist" ON public.booking_waitlist;
CREATE POLICY "Salon members can view booking waitlist"
ON public.booking_waitlist
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

DROP POLICY IF EXISTS "Salon members can create booking waitlist entries" ON public.booking_waitlist;
CREATE POLICY "Salon members can create booking waitlist entries"
ON public.booking_waitlist
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_salon(auth.uid(), salon_id));

DROP POLICY IF EXISTS "Salon members can update booking waitlist entries" ON public.booking_waitlist;
CREATE POLICY "Salon members can update booking waitlist entries"
ON public.booking_waitlist
FOR UPDATE
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id))
WITH CHECK (public.can_access_salon(auth.uid(), salon_id));

DROP POLICY IF EXISTS "Salon members can delete booking waitlist entries" ON public.booking_waitlist;
CREATE POLICY "Salon members can delete booking waitlist entries"
ON public.booking_waitlist
FOR DELETE
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

CREATE INDEX IF NOT EXISTS booking_waitlist_active_match_idx
  ON public.booking_waitlist (salon_id, service_id, preferred_date_from, preferred_date_to)
  WHERE status IN ('active', 'notified');

CREATE INDEX IF NOT EXISTS booking_waitlist_phone_idx
  ON public.booking_waitlist (salon_id, client_phone, created_at DESC);

DROP TRIGGER IF EXISTS booking_waitlist_set_updated_at ON public.booking_waitlist;
CREATE TRIGGER booking_waitlist_set_updated_at
BEFORE UPDATE ON public.booking_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.booking_waitlist_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  source_appointment_id uuid NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_waitlist_opening_unique
    UNIQUE (source_appointment_id, start_time, service_id)
);

ALTER TABLE public.booking_waitlist_openings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS booking_waitlist_openings_pending_idx
  ON public.booking_waitlist_openings (created_at)
  WHERE processed_at IS NULL;

CREATE OR REPLACE FUNCTION public.enqueue_booking_waitlist_opening()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  source_row public.appointments%ROWTYPE;
  service_id_value uuid;
BEGIN
  source_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'cancelled' OR NEW.status <> 'cancelled' THEN
      RETURN NEW;
    END IF;
  END IF;

  IF source_row.start_time <= now()
     OR source_row.salon_id IS NULL
     OR source_row.staff_id IS NULL
     OR source_row.services IS NULL
     OR jsonb_typeof(source_row.services) <> 'array'
     OR jsonb_array_length(source_row.services) = 0 THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  BEGIN
    service_id_value := (source_row.services -> 0 ->> 'id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END;

  IF service_id_value IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  INSERT INTO public.booking_waitlist_openings (
    salon_id,
    service_id,
    staff_id,
    source_appointment_id,
    start_time,
    end_time
  )
  VALUES (
    source_row.salon_id,
    service_id_value,
    source_row.staff_id,
    source_row.id,
    source_row.start_time,
    source_row.end_time
  )
  ON CONFLICT (source_appointment_id, start_time, service_id)
  DO NOTHING;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS appointments_enqueue_waitlist_on_cancel
  ON public.appointments;

CREATE TRIGGER appointments_enqueue_waitlist_on_cancel
AFTER UPDATE OF status
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_booking_waitlist_opening();

DROP TRIGGER IF EXISTS appointments_enqueue_waitlist_on_delete
  ON public.appointments;

CREATE TRIGGER appointments_enqueue_waitlist_on_delete
AFTER DELETE
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_booking_waitlist_opening();
