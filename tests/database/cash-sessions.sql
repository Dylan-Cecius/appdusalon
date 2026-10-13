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
  to_regclass('public.cash_sessions') IS NOT NULL,
  'cash sessions table exists'
);

SELECT pg_temp.assert_true(
  to_regclass('public.cash_movements') IS NOT NULL,
  'cash movements table exists'
);

SELECT pg_temp.assert_true(
  to_regprocedure('public.open_cash_session(numeric,text)') IS NOT NULL,
  'cash session open RPC exists'
);

SELECT pg_temp.assert_true(
  to_regprocedure('public.record_cash_movement(text,numeric,text)') IS NOT NULL,
  'cash movement RPC exists'
);

SELECT pg_temp.assert_true(
  to_regprocedure('public.close_cash_session(numeric,text)') IS NOT NULL,
  'cash session close RPC exists'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'cash_sessions_one_open_per_salon_idx'
  ),
  'only one open cash session per salon is enforced'
);

SELECT pg_temp.assert_true(
  position(
    'has_role_in_salon'
    in pg_get_functiondef('public.open_cash_session(numeric,text)'::regprocedure)
  ) > 0
  AND position(
    'has_role_in_salon'
    in pg_get_functiondef('public.close_cash_session(numeric,text)'::regprocedure)
  ) > 0,
  'cash opening and closing retain admin authorization'
);

SELECT pg_temp.assert_true(
  position(
    'transaction_payments'
    in pg_get_functiondef('public.close_cash_session(numeric,text)'::regprocedure)
  ) > 0,
  'cash closing includes mixed-payment cash components'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('cash_sessions','cash_movements')
      AND 'authenticated' = ANY(roles)
      AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
  ),
  'cash ledger cannot be mutated directly by authenticated clients'
);
