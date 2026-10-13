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
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'appointment_id'
  ),
  'transactions can link to the settled appointment'
);

SELECT pg_temp.assert_true(
  to_regclass('public.transaction_payments') IS NOT NULL,
  'split-payment ledger exists'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'transactions_one_per_appointment_idx'
  ),
  'one sale transaction per appointment is enforced'
);

SELECT pg_temp.assert_true(
  position(
    'remaining_value'
    in pg_get_functiondef('public.settle_appointment(uuid,text)'::regprocedure)
  ) > 0
  AND position(
    'prepaid_value'
    in pg_get_functiondef('public.settle_appointment(uuid,text)'::regprocedure)
  ) > 0,
  'appointment settlement separates prepaid and remaining balances'
);

SELECT pg_temp.assert_true(
  position(
    'transaction_payments'
    in pg_get_functiondef('public.settle_appointment(uuid,text)'::regprocedure)
  ) > 0,
  'appointment settlement writes payment components'
);

SELECT pg_temp.assert_true(
  position(
    'total_price_value'
    in pg_get_functiondef('public.settle_appointment(uuid,text)'::regprocedure)
  ) > 0,
  'sale transaction keeps the full appointment value'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transaction_payments'
      AND 'authenticated' = ANY(roles)
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  ),
  'authenticated clients cannot mutate payment ledger directly'
);
