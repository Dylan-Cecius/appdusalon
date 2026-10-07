\set ON_ERROR_STOP on
-- Exercise the exact V2 migration with both valid and non-UUID legacy text ids.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'legacy_recovery_tests'
     OR to_regclass('public.appointments') IS NOT NULL
     OR to_regclass('public.barbers') IS NOT NULL
     OR to_regclass('public.staff') IS NOT NULL
     OR to_regclass('public.salons') IS NOT NULL THEN
    RAISE EXCEPTION 'Refusing to run outside an empty legacy_recovery_tests database';
  END IF;
END $$;
CREATE TABLE public.salons (
  id uuid PRIMARY KEY, owner_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE public.barbers (
  id uuid PRIMARY KEY, salon_id uuid, user_id uuid NOT NULL, name text NOT NULL,
  color text, is_active boolean, start_time time, end_time time, working_days text[]
);
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), salon_id uuid NOT NULL, name text NOT NULL,
  role text, color text, phone text, email text, commission_rate numeric, is_active boolean,
  start_time time, end_time time, working_days text[], daily_schedules jsonb
);
CREATE TABLE public.appointments (
  id integer PRIMARY KEY, salon_id uuid NOT NULL, barber_id text, staff_id uuid
);
CREATE FUNCTION pg_temp.assert_true(p_ok boolean, p_label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'FAIL: %', p_label; END IF;
  RAISE NOTICE 'PASS: %', p_label;
END $$;

\ir ../../supabase/migrations/20261006150000_migrate_barbers_to_staff.sql
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.staff), 'empty barber migration');

INSERT INTO public.salons (id, owner_user_id)
SELECT ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
       ('10000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid
FROM generate_series(1,3) n;
INSERT INTO public.barbers
SELECT ('20000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
       CASE WHEN n <= 2 THEN ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid ELSE NULL END,
       ('10000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
       CASE WHEN n <= 2 THEN 'Alice' ELSE 'Charlie' END,
       'bg-blue-600', true, TIME '09:00', TIME '18:00', NULL
FROM generate_series(1,4) n;
INSERT INTO public.staff (id,salon_id,name)
VALUES ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', ' ALICE ');
INSERT INTO public.appointments
SELECT n, ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
       ('20000000-0000-0000-0000-' || lpad(n::text,12,'0')), NULL
FROM generate_series(1,3) n;
INSERT INTO public.appointments VALUES
  (4, '00000000-0000-0000-0000-000000000001', 'legacy-unassigned', NULL),
  (5, '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000099'),
  (6, '00000000-0000-0000-0000-000000000001', NULL, NULL);

\ir ../../supabase/migrations/20261006150000_migrate_barbers_to_staff.sql
SELECT pg_temp.assert_true((SELECT count(*) = 3 FROM public.staff), 'existing staff reused, orphan barber skipped, owner salon fallback');
SELECT pg_temp.assert_true((
  SELECT count(*) = 3 FROM public.appointments a JOIN public.staff s ON s.id = a.staff_id
  WHERE a.id <= 3 AND s.salon_id = a.salon_id
), 'text UUID references map to staff in the appointment salon');
SELECT pg_temp.assert_true((SELECT staff_id = '30000000-0000-0000-0000-000000000001'::uuid FROM public.appointments WHERE id = 1), 'case-insensitive legacy name reuses existing staff');
SELECT pg_temp.assert_true((SELECT count(*) = 2 FROM public.appointments WHERE id IN (4,6) AND staff_id IS NULL), 'non-UUID and null legacy text values do not cause cast errors');
SELECT pg_temp.assert_true((SELECT staff_id = '30000000-0000-0000-0000-000000000099'::uuid FROM public.appointments WHERE id = 5), 'existing staff assignments preserved');
SELECT pg_temp.assert_true((SELECT count(*) = 4 FROM public.barbers), 'legacy barber rows preserved');
SELECT pg_temp.assert_true((
  SELECT count(*) = 2 FROM public.staff WHERE color = '#2563EB'
    AND cardinality(working_days) = 6
    AND daily_schedules->'Monday'->>'start' = '09:00:00'
    AND daily_schedules->'Saturday'->>'end' = '18:00:00'
), 'legacy colors and default working schedules preserved');

CREATE TEMP TABLE expected_staff AS SELECT * FROM public.staff;
CREATE TEMP TABLE expected_appointments AS SELECT * FROM public.appointments;
\ir ../../supabase/migrations/20261006150000_migrate_barbers_to_staff.sql
SELECT pg_temp.assert_true(NOT EXISTS (
  (SELECT * FROM public.staff EXCEPT SELECT * FROM expected_staff)
  UNION ALL (SELECT * FROM expected_staff EXCEPT SELECT * FROM public.staff)
) AND NOT EXISTS (
  (SELECT * FROM public.appointments EXCEPT SELECT * FROM expected_appointments)
  UNION ALL (SELECT * FROM expected_appointments EXCEPT SELECT * FROM public.appointments)
), 'replay does not duplicate staff or change existing assignments');
ROLLBACK;
