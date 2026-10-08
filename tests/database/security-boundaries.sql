\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.assert_true(p_ok boolean, p_label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'FAIL: %', p_label;
  END IF;
  RAISE NOTICE 'PASS: %', p_label;
END $$;

-- Tables whose direct writes are admin-only.
WITH sensitive(table_name) AS (
  VALUES
    ('services'),
    ('opening_hours'),
    ('salon_settings'),
    ('employees'),
    ('user_roles'),
    ('sms_campaigns'),
    ('sms_logs')
)
SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies p
    JOIN sensitive s ON s.table_name = p.tablename
    WHERE p.schemaname = 'public'
      AND 'authenticated' = ANY(p.roles)
      AND p.cmd IN ('INSERT','UPDATE','DELETE','ALL')
      AND position(
        'has_role_in_salon'
        in COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')
      ) = 0
  ),
  'sensitive direct writes require salon admin role'
);

-- Client collaboration is allowed for reads/creates/updates, but deletion
-- must go through the privacy-safe SECURITY DEFINER erasure RPC.
SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = 'clients'
      AND 'authenticated' = ANY(p.roles)
      AND p.cmd IN ('DELETE','ALL')
  ),
  'clients cannot be deleted directly through authenticated RLS'
);

SELECT pg_temp.assert_true(
  to_regprocedure('public.erase_client_personal_data(uuid)') IS NOT NULL,
  'privacy-safe client erasure RPC exists'
);

-- Employees may edit agenda data, but service configuration is never collaborative.
SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='public'
      AND p.tablename='services'
      AND p.cmd='SELECT'
      AND 'authenticated'=ANY(p.roles)
      AND position('can_access_salon' in COALESCE(p.qual,'')) > 0
  ),
  'valid salon members can read services'
);

-- Transaction history must not regain a broad salon-wide SELECT policy.
SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='public'
      AND p.tablename='transactions'
      AND p.cmd='SELECT'
      AND 'authenticated'=ANY(p.roles)
      AND (
        position('is_salon_admin' in COALESCE(p.qual,'')) = 0
        OR position('get_user_employee_id' in COALESCE(p.qual,'')) = 0
      )
  ),
  'transaction history remains admin-or-own-employee scoped'
);

-- Linked staff records cannot be removed before access is revoked.
SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.staff'::regclass
      AND tgname='staff_prevent_linked_delete'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ),
  'linked staff deletion guard remains enabled'
);

-- Appointment overlap protection must remain active.
SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.appointments'::regclass
      AND tgname='appointments_prevent_staff_overlap'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ),
  'appointment overlap guard remains enabled'
);
