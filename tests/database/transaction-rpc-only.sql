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
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions'
      AND 'authenticated' = ANY(roles)
      AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
  ),
  'authenticated users cannot mutate transactions directly through RLS'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions'
      AND cmd = 'SELECT'
      AND 'authenticated' = ANY(roles)
      AND position('is_salon_admin' in COALESCE(qual, '')) > 0
      AND position('get_user_employee_id' in COALESCE(qual, '')) > 0
  ),
  'transaction history remains restricted to admins or the creating employee'
);

SELECT pg_temp.assert_true(
  to_regprocedure('public.record_pos_transaction(jsonb,numeric,text,uuid,uuid)') IS NOT NULL,
  'atomic POS transaction RPC exists'
);

SELECT pg_temp.assert_true(
  to_regprocedure('public.settle_appointment(uuid,text)') IS NOT NULL,
  'appointment settlement RPC exists'
);

SELECT pg_temp.assert_true(
  to_regprocedure('public.delete_pos_transaction(uuid)') IS NOT NULL,
  'POS cancellation RPC exists'
);

SELECT pg_temp.assert_true(
  position(
    'has_role_in_salon'
    in pg_get_functiondef('public.delete_pos_transaction(uuid)'::regprocedure)
  ) > 0,
  'POS cancellation RPC retains admin authorization'
);

SELECT pg_temp.assert_true(
  position(
    'salon_can_manage_inventory'
    in pg_get_functiondef('public.record_pos_transaction(jsonb,numeric,text,uuid,uuid)'::regprocedure)
  ) > 0,
  'product POS sales retain inventory entitlement enforcement'
);
