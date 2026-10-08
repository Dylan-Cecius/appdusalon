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
  to_regprocedure('public.salon_can_manage_inventory(uuid)') IS NOT NULL,
  'inventory entitlement helper exists'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND cmd = 'SELECT'
      AND 'authenticated' = ANY(roles)
      AND position('salon_can_manage_inventory' in COALESCE(qual, '')) = 0
  ),
  'all authenticated product SELECT policies require inventory entitlement'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'stock_movements'
      AND cmd = 'SELECT'
      AND 'authenticated' = ANY(roles)
      AND position('salon_can_manage_inventory' in COALESCE(qual, '')) = 0
  ),
  'all authenticated stock SELECT policies require inventory entitlement'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'products'
      AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
      AND 'authenticated' = ANY(roles)
      AND position(
        'salon_can_manage_inventory'
        in COALESCE(qual, '') || ' ' || COALESCE(with_check, '')
      ) = 0
  ),
  'all authenticated product write policies require inventory entitlement'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'stock_movements'
      AND cmd IN ('INSERT','UPDATE','DELETE','ALL')
      AND 'authenticated' = ANY(roles)
      AND position(
        'salon_can_manage_inventory'
        in COALESCE(qual, '') || ' ' || COALESCE(with_check, '')
      ) = 0
  ),
  'all authenticated stock write policies require inventory entitlement'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.products'::regclass
      AND tgname = 'products_enforce_inventory_entitlement'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ),
  'product entitlement trigger remains enabled'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.stock_movements'::regclass
      AND tgname = 'stock_movements_enforce_inventory_entitlement'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ),
  'stock entitlement trigger remains enabled'
);
