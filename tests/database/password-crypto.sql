\set ON_ERROR_STOP on
-- Run only inside the disposable Supabase database container in V2 Database CI.
-- Test the functions after the complete migration replay, without creating users
-- or salon rows. Roll back the session settings and any accidental writes.
BEGIN;
SET LOCAL search_path = pg_catalog;
DO $$
DECLARE
  password_value text := 'v2-disposable-crypto-check';
  first_hash text;
  second_hash text;
BEGIN
  IF current_database() <> 'postgres'
     OR to_regclass('public.salon_settings') IS NULL
     OR auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected password regression database or authentication context';
  END IF;

  first_hash := public.hash_password(password_value);
  IF first_hash IS NULL OR first_hash !~ '^\$2[aby]\$10\$' OR length(first_hash) <> 60 THEN
    RAISE EXCEPTION 'hash_password must produce bcrypt cost 10, not a silent MD5 fallback';
  END IF;
  RAISE NOTICE 'PASS: bcrypt is available with caller search_path restricted to pg_catalog';

  second_hash := public.hash_password(password_value);
  IF second_hash IS NULL OR second_hash = first_hash THEN
    RAISE EXCEPTION 'Password hashes must have independent random salts';
  END IF;
  RAISE NOTICE 'PASS: hashes use independent salts';

  IF public.verify_password(password_value, first_hash) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Correct password was rejected';
  END IF;
  RAISE NOTICE 'PASS: correct bcrypt password accepted';

  IF public.verify_password('wrong-password', first_hash) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Wrong password was accepted';
  END IF;
  RAISE NOTICE 'PASS: wrong bcrypt password rejected';

  IF public.verify_password(password_value, md5(password_value || 'salon_salt_2024')) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Existing legacy password compatibility changed';
  END IF;
  RAISE NOTICE 'PASS: existing legacy hash compatibility preserved';

  IF public.verify_stats_password(password_value) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Unauthenticated statistics password verification was accepted';
  END IF;
  RAISE NOTICE 'PASS: statistics verification still requires authentication';

  BEGIN
    PERFORM public.set_stats_password(password_value);
    RAISE EXCEPTION 'Unauthenticated statistics password update was accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'not_authenticated' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'PASS: statistics password update still requires authentication';
END $$;
ROLLBACK;
