\set ON_ERROR_STOP on

DO $$
DECLARE
  leaked text;
BEGIN
  SELECT string_agg(format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)), E'\n')
  INTO leaked
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND has_function_privilege('public', p.oid, 'EXECUTE');

  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'SECURITY DEFINER functions executable by PUBLIC:%', E'\n' || leaked;
  END IF;

  RAISE NOTICE 'PASS: no public SECURITY DEFINER function is executable by PUBLIC';
END $$;
