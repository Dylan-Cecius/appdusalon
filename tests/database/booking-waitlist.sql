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
  to_regclass('public.booking_waitlist') IS NOT NULL,
  'booking waitlist table exists'
);

SELECT pg_temp.assert_true(
  to_regclass('public.booking_waitlist_openings') IS NOT NULL,
  'booking waitlist openings table exists'
);

SELECT pg_temp.assert_true(
  (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid='public.booking_waitlist'::regclass
  ),
  'booking waitlist has RLS enabled'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='booking_waitlist'
      AND cmd='SELECT'
      AND position('can_access_salon' in COALESCE(qual,'')) > 0
  ),
  'salon members can only read their waitlist'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid='public.appointments'::regclass
      AND tgname='appointments_enqueue_waitlist_on_cancel'
      AND NOT tgisinternal
  )
  AND EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid='public.appointments'::regclass
      AND tgname='appointments_enqueue_waitlist_on_delete'
      AND NOT tgisinternal
  ),
  'appointment cancellation and deletion enqueue waitlist openings'
);

SELECT pg_temp.assert_true(
  position(
    'source_row.start_time <= now()'
    in pg_get_functiondef('public.enqueue_booking_waitlist_opening()'::regprocedure)
  ) > 0,
  'waitlist opening trigger ignores past appointments'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname='public'
      AND indexname='booking_waitlist_active_match_idx'
  )
  AND EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname='public'
      AND indexname='booking_waitlist_openings_pending_idx'
  ),
  'waitlist matching and opening processing are indexed'
);
