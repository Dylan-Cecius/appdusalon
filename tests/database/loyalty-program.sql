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
  to_regclass('public.loyalty_programs') IS NOT NULL,
  'loyalty program table exists'
);

SELECT pg_temp.assert_true(
  to_regclass('public.client_loyalty_accounts') IS NOT NULL,
  'client loyalty accounts table exists'
);

SELECT pg_temp.assert_true(
  to_regclass('public.loyalty_events') IS NOT NULL,
  'loyalty ledger exists'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'transactions_apply_loyalty'
      AND NOT tgisinternal
  ),
  'transaction insert awards loyalty points'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'transactions_reverse_loyalty'
      AND NOT tgisinternal
  ),
  'transaction deletion reverses loyalty points'
);

SELECT pg_temp.assert_true(
  to_regprocedure('public.redeem_loyalty_reward(uuid,integer,text)') IS NOT NULL,
  'loyalty reward redemption RPC exists'
);

SELECT pg_temp.assert_true(
  position(
    'points_balance'
    in pg_get_functiondef('public.redeem_loyalty_reward(uuid,integer,text)'::regprocedure)
  ) > 0
  AND position(
    'insufficient_points'
    in pg_get_functiondef('public.redeem_loyalty_reward(uuid,integer,text)'::regprocedure)
  ) > 0,
  'redemption RPC enforces point balance'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('client_loyalty_accounts','loyalty_events')
      AND 'authenticated' = ANY(roles)
      AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
  ),
  'loyalty balances and ledger cannot be directly mutated by clients'
);
