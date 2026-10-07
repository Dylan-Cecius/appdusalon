\set ON_ERROR_STOP on
-- Run only on the disposable PostgreSQL service created by V2 Database CI.
-- This tests the exact migration file, not a copied implementation.
BEGIN;
SET LOCAL TIME ZONE 'Europe/Brussels';
DO $$
BEGIN
  IF current_database() <> 'legacy_recovery_tests'
     OR to_regclass('public.appointments') IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to run outside an empty legacy_recovery_tests database';
  END IF;
END $$;

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_time > start_time)
);
CREATE TEMP TABLE expected_untouched AS SELECT * FROM public.appointments;
CREATE FUNCTION pg_temp.assert_true(p_ok boolean, p_label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'FAIL: %', p_label;
  END IF;
  RAISE NOTICE 'PASS: %', p_label;
END $$;

-- 1. A new database must accept the migration without creating appointments.
\ir ../../supabase/migrations/20250831223354_cb1556da-c701-4854-8f98-82e73c539897.sql
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.appointments), 'empty database');

-- 2. Another account must remain untouched when the historical account is absent.
INSERT INTO public.appointments VALUES (
  '00000000-0000-0000-0000-000000000999',
  '00000000-0000-0000-0000-000000000099',
  CURRENT_TIMESTAMP - INTERVAL '10 days',
  CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '30 minutes',
  CURRENT_TIMESTAMP
);
INSERT INTO expected_untouched SELECT * FROM public.appointments;
\ir ../../supabase/migrations/20250831223354_cb1556da-c701-4854-8f98-82e73c539897.sql
SELECT pg_temp.assert_true(NOT EXISTS (
  (SELECT * FROM public.appointments EXCEPT SELECT * FROM expected_untouched)
  UNION ALL
  (SELECT * FROM expected_untouched EXCEPT SELECT * FROM public.appointments)
), 'absent historical account leaves other accounts unchanged');

-- 3. Seven past appointments: the latest five get today's slots, the other two
-- get yesterday's slots. Existing future/today appointments are not selected.
INSERT INTO public.appointments
SELECT ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '1e96d777-a6ef-41da-b4b3-261b9186d706'::uuid,
  (CURRENT_DATE - 10) + TIME '08:00',
  (CURRENT_DATE - 10) + TIME '08:30',
  CURRENT_TIMESTAMP - (8 - n) * INTERVAL '1 day'
FROM generate_series(1, 7) AS n;
INSERT INTO public.appointments
SELECT ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '1e96d777-a6ef-41da-b4b3-261b9186d706'::uuid,
  (CURRENT_DATE + CASE WHEN n = 8 THEN 7 ELSE 0 END) + TIME '20:00',
  (CURRENT_DATE + CASE WHEN n = 8 THEN 7 ELSE 0 END) + TIME '20:30',
  CURRENT_TIMESTAMP - INTERVAL '20 days'
FROM generate_series(8, 9) AS n;
INSERT INTO expected_untouched SELECT * FROM public.appointments
WHERE id IN ('00000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000009');
\ir ../../supabase/migrations/20250831223354_cb1556da-c701-4854-8f98-82e73c539897.sql
SELECT pg_temp.assert_true((
  SELECT count(*) = 5 FROM public.appointments AS a
  JOIN generate_series(3, 7) AS n
    ON a.id = ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid
  WHERE a.start_time = CURRENT_DATE + TIME '09:00' + (n - 3) * INTERVAL '2 hours'
    AND a.end_time = a.start_time + INTERVAL '30 minutes'
    AND a.created_at = CURRENT_TIMESTAMP
), 'five latest appointments have the expected daily slots');
SELECT pg_temp.assert_true((
  SELECT count(*) = 2 FROM public.appointments AS a
  JOIN generate_series(1, 2) AS n
    ON a.id = ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid
  WHERE a.start_time = (CURRENT_DATE - 1) + TIME '10:00' + (n - 1) * INTERVAL '1 hour'
    AND a.end_time = a.start_time + INTERVAL '30 minutes'
    AND a.created_at = CURRENT_TIMESTAMP - (8 - n) * INTERVAL '1 day'
), 'remaining past appointments retain creation dates and get yesterday slots');
SELECT pg_temp.assert_true(
  (SELECT count(*) = 10 FROM public.appointments)
  AND NOT EXISTS (
    SELECT * FROM expected_untouched EXCEPT SELECT * FROM public.appointments
  ), 'other accounts and unselected current/future appointments are unchanged');

CREATE TEMP TABLE expected_after_first_run AS SELECT * FROM public.appointments;
\ir ../../supabase/migrations/20250831223354_cb1556da-c701-4854-8f98-82e73c539897.sql
SELECT pg_temp.assert_true(NOT EXISTS (
  (SELECT * FROM public.appointments EXCEPT SELECT * FROM expected_after_first_run)
  UNION ALL
  (SELECT * FROM expected_after_first_run EXCEPT SELECT * FROM public.appointments)
), 'repeat in the same transaction does not move slots');

-- 4. Equal creation timestamps have a deterministic id tie-breaker.
TRUNCATE public.appointments;
INSERT INTO public.appointments
SELECT ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '1e96d777-a6ef-41da-b4b3-261b9186d706'::uuid,
  (CURRENT_DATE - 10) + TIME '08:00',
  (CURRENT_DATE - 10) + TIME '08:30',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM generate_series(1, 6) AS n ORDER BY n DESC;
\ir ../../supabase/migrations/20250831223354_cb1556da-c701-4854-8f98-82e73c539897.sql
SELECT pg_temp.assert_true((
  SELECT count(*) = 6 FROM public.appointments AS a
  JOIN generate_series(1, 6) AS n
    ON a.id = ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid
  WHERE a.start_time = CASE WHEN n <= 5
    THEN CURRENT_DATE + TIME '09:00' + (n - 1) * INTERVAL '2 hours'
    ELSE (CURRENT_DATE - 1) + TIME '10:00' END
    AND a.end_time = a.start_time + INTERVAL '30 minutes'
), 'equal creation timestamps select ids deterministically');

-- 5. Fewer than five appointments are supported too.
TRUNCATE public.appointments;
INSERT INTO public.appointments
SELECT ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  '1e96d777-a6ef-41da-b4b3-261b9186d706'::uuid,
  (CURRENT_DATE - 10) + TIME '08:00',
  (CURRENT_DATE - 10) + TIME '08:30',
  CURRENT_TIMESTAMP
FROM generate_series(1, 2) AS n;
\ir ../../supabase/migrations/20250831223354_cb1556da-c701-4854-8f98-82e73c539897.sql
SELECT pg_temp.assert_true((
  SELECT count(*) = 2 FROM public.appointments AS a
  JOIN generate_series(1, 2) AS n
    ON a.id = ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid
  WHERE a.start_time = CURRENT_DATE + TIME '09:00' + (n - 1) * INTERVAL '2 hours'
    AND a.end_time = a.start_time + INTERVAL '30 minutes'
), 'fewer than five appointments');

ROLLBACK;
