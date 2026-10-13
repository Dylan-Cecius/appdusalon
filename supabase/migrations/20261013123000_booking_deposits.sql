-- V2.1: online booking deposits, payment holds and cancellation policy.
-- Backwards-compatible defaults keep every existing service/appointment unchanged.

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS booking_payment_mode text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS booking_payment_value numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_deadline_hours integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS late_cancellation_policy text NOT NULL DEFAULT 'keep_deposit';

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_booking_payment_mode_check,
  DROP CONSTRAINT IF EXISTS services_booking_payment_value_check,
  DROP CONSTRAINT IF EXISTS services_cancellation_deadline_hours_check,
  DROP CONSTRAINT IF EXISTS services_late_cancellation_policy_check;

ALTER TABLE public.services
  ADD CONSTRAINT services_booking_payment_mode_check
    CHECK (booking_payment_mode IN ('none', 'deposit_fixed', 'deposit_percent', 'full')),
  ADD CONSTRAINT services_booking_payment_value_check
    CHECK (booking_payment_value >= 0 AND booking_payment_value <= 100000),
  ADD CONSTRAINT services_cancellation_deadline_hours_check
    CHECK (cancellation_deadline_hours >= 0 AND cancellation_deadline_hours <= 720),
  ADD CONSTRAINT services_late_cancellation_policy_check
    CHECK (late_cancellation_policy IN ('keep_deposit', 'refund_deposit'));

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS deposit_required numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_deadline_at timestamptz;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_status_check,
  DROP CONSTRAINT IF EXISTS appointments_payment_status_check,
  DROP CONSTRAINT IF EXISTS appointments_deposit_required_check,
  DROP CONSTRAINT IF EXISTS appointments_amount_paid_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
    CHECK (status IN ('pending_payment', 'scheduled', 'completed', 'cancelled', 'no_show')),
  ADD CONSTRAINT appointments_payment_status_check
    CHECK (payment_status IN ('unpaid', 'pending', 'deposit_paid', 'paid', 'refunded', 'expired')),
  ADD CONSTRAINT appointments_deposit_required_check
    CHECK (deposit_required >= 0),
  ADD CONSTRAINT appointments_amount_paid_check
    CHECK (amount_paid >= 0);

CREATE INDEX IF NOT EXISTS appointments_pending_payment_expiry_idx
  ON public.appointments (payment_expires_at)
  WHERE status = 'pending_payment';

CREATE INDEX IF NOT EXISTS appointments_payment_reference_idx
  ON public.appointments (payment_reference)
  WHERE payment_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.calculate_booking_payment_amount(
  total_price_value numeric,
  payment_mode_value text,
  payment_value numeric
)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT round(
    CASE
      WHEN COALESCE(total_price_value, 0) <= 0 THEN 0
      WHEN payment_mode_value = 'full' THEN GREATEST(total_price_value, 0)
      WHEN payment_mode_value = 'deposit_fixed'
        THEN LEAST(GREATEST(COALESCE(payment_value, 0), 0), GREATEST(total_price_value, 0))
      WHEN payment_mode_value = 'deposit_percent'
        THEN GREATEST(total_price_value, 0)
          * LEAST(GREATEST(COALESCE(payment_value, 0), 0), 100) / 100
      ELSE 0
    END,
    2
  );
$$;

REVOKE ALL ON FUNCTION public.calculate_booking_payment_amount(numeric, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_booking_payment_amount(numeric, text, numeric)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.expire_pending_booking_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
BEGIN
  UPDATE public.appointments
  SET
    status = 'cancelled',
    payment_status = 'expired',
    updated_at = now()
  WHERE status = 'pending_payment'
    AND payment_status = 'pending'
    AND payment_expires_at IS NOT NULL
    AND payment_expires_at <= now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pending_booking_payments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_pending_booking_payments() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_booking_payments() TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_staff_appointment_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending_payment' AND NEW.payment_expires_at IS NULL THEN
    NEW.payment_expires_at := now() + interval '30 minutes';
  END IF;

  IF NEW.status NOT IN ('scheduled', 'pending_payment') THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'pending_payment'
     AND NEW.payment_expires_at IS NOT NULL
     AND NEW.payment_expires_at <= now() THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.staff_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.appointments existing
    WHERE existing.staff_id = NEW.staff_id
      AND existing.id IS DISTINCT FROM NEW.id
      AND (
        existing.status = 'scheduled'
        OR (
          existing.status = 'pending_payment'
          AND existing.payment_status = 'pending'
          AND existing.payment_expires_at IS NOT NULL
          AND existing.payment_expires_at > now()
        )
      )
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
BEFORE INSERT OR UPDATE OF staff_id, start_time, end_time, status, payment_expires_at
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_staff_appointment_overlap();
