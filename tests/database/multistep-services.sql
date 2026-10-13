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
  to_regclass('public.service_steps') IS NOT NULL
  AND to_regclass('public.appointment_segments') IS NOT NULL,
  'multi-step service and appointment segment tables exist'
);

SELECT pg_temp.assert_true(
  (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid='public.service_steps'::regclass
  )
  AND (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid='public.appointment_segments'::regclass
  ),
  'multi-step tables have RLS enabled'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid='public.appointment_segments'::regclass
      AND tgname='appointment_segments_prevent_overlap'
      AND NOT tgisinternal
  ),
  'staff overlap protection is enforced at segment level'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid='public.appointments'::regclass
      AND tgname='appointments_refresh_segments'
      AND NOT tgisinternal
  ),
  'appointments automatically rebuild occupancy segments'
);

SELECT pg_temp.assert_true(
  position(
    'step_record.step_type <> ''pause'''
    in pg_get_functiondef('public.rebuild_appointment_segments(uuid)'::regprocedure)
  ) > 0,
  'pause steps do not occupy staff'
);

SELECT pg_temp.assert_true(
  position(
    '''cleanup'''
    in pg_get_functiondef('public.rebuild_appointment_segments(uuid)'::regprocedure)
  ) > 0
  AND position(
    '''Préparation / nettoyage'''
    in pg_get_functiondef('public.rebuild_appointment_segments(uuid)'::regprocedure)
  ) > 0,
  'cleanup segments remain explicit staff occupancy'
);

SELECT pg_temp.assert_true(
  position(
    'service_steps'
    in pg_get_functiondef('public.normalize_appointment_catalog_values()'::regprocedure)
  ) > 0,
  'appointment duration uses configured service steps'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename='service_steps'
      AND 'authenticated'=ANY(roles)
      AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
      AND position('has_role_in_salon' in COALESCE(qual,'') || ' ' || COALESCE(with_check,'')) = 0
  ),
  'service-step mutations remain admin-only'
);
