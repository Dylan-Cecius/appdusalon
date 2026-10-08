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
  position('auth.role()' in pg_get_functiondef('public.get_user_salon_id(uuid)'::regprocedure)) > 0
  AND position('auth.uid()' in pg_get_functiondef('public.get_user_salon_id(uuid)'::regprocedure)) > 0,
  'get_user_salon_id blocks cross-user probing'
);

SELECT pg_temp.assert_true(
  position('auth.role()' in pg_get_functiondef('public.get_user_employee_id(uuid)'::regprocedure)) > 0
  AND position('auth.uid()' in pg_get_functiondef('public.get_user_employee_id(uuid)'::regprocedure)) > 0,
  'get_user_employee_id blocks cross-user probing'
);

SELECT pg_temp.assert_true(
  position('auth.role()' in pg_get_functiondef('public.has_role_in_salon(uuid,uuid,public.app_role)'::regprocedure)) > 0
  AND position('auth.uid()' in pg_get_functiondef('public.has_role_in_salon(uuid,uuid,public.app_role)'::regprocedure)) > 0,
  'has_role_in_salon blocks cross-user probing'
);
