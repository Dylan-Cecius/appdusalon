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
  position('auth.role()' in pg_get_functiondef('public.is_salon_admin(uuid)'::regprocedure)) > 0
  AND position('auth.uid()' in pg_get_functiondef('public.is_salon_admin(uuid)'::regprocedure)) > 0,
  'is_salon_admin blocks cross-user probing'
);

SELECT pg_temp.assert_true(
  position('auth.role()' in pg_get_functiondef('public.user_owns_barber(uuid,uuid)'::regprocedure)) > 0
  AND position('auth.uid()' in pg_get_functiondef('public.user_owns_barber(uuid,uuid)'::regprocedure)) > 0,
  'user_owns_barber blocks arbitrary target users'
);

SELECT pg_temp.assert_true(
  position('auth.role()' in pg_get_functiondef('public.get_barber_owner(uuid)'::regprocedure)) > 0
  AND position('auth.uid()' in pg_get_functiondef('public.get_barber_owner(uuid)'::regprocedure)) > 0,
  'get_barber_owner hides cross-user owner ids'
);
