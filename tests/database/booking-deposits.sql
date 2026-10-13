\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.assert_true(p_ok boolean, p_label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'FAIL: %', p_label;
  END IF;
  RAISE NOTICE 'PASS: %', p_label;
END $$;

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='services'
      AND column_name='booking_payment_mode'
  ),
  'services expose online booking payment policy'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='appointments'
      AND column_name='payment_status'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='appointments'
      AND column_name='payment_expires_at'
  ),
  'appointments store booking payment state and expiry'
);

SELECT pg_temp.assert_true(
  public.calculate_booking_payment_amount(80, 'none', 0) = 0
  AND public.calculate_booking_payment_amount(80, 'deposit_fixed', 25) = 25
  AND public.calculate_booking_payment_amount(20, 'deposit_fixed', 25) = 20
  AND public.calculate_booking_payment_amount(80, 'deposit_percent', 25) = 20
  AND public.calculate_booking_payment_amount(80, 'full', 0) = 80,
  'booking payment amount is calculated server-side'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid='public.appointments'::regclass
      AND conname='appointments_status_check'
      AND position('pending_payment' in pg_get_constraintdef(oid)) > 0
  ),
  'appointments support pending payment holds'
);

SELECT pg_temp.assert_true(
  position(
    'pending_payment'
    in pg_get_functiondef('public.rebuild_appointment_segments(uuid)'::regprocedure)
  ) > 0
  AND EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid='public.appointment_segments'::regclass
      AND tgname='appointment_segments_prevent_overlap'
      AND NOT tgisinternal
  ),
  'active payment holds participate in segment-level overlap protection'
);

SELECT pg_temp.assert_true(
  to_regprocedure('public.expire_pending_booking_payments()') IS NOT NULL
  AND NOT has_function_privilege(
    'public',
    'public.expire_pending_booking_payments()',
    'EXECUTE'
  ),
  'payment-hold expiry RPC exists without PUBLIC execute'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname='public'
      AND indexname='appointments_pending_payment_expiry_idx'
  ),
  'pending payment expiry lookup is indexed'
);
