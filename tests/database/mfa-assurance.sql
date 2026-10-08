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
  to_regprocedure('public.mfa_session_is_sufficient()') IS NOT NULL,
  'central MFA assurance helper exists'
);

SELECT pg_temp.assert_true(
  position('auth.mfa_factors' in pg_get_functiondef('public.mfa_session_is_sufficient()'::regprocedure)) > 0
  AND position('aal2' in pg_get_functiondef('public.mfa_session_is_sufficient()'::regprocedure)) > 0,
  'MFA helper requires aal2 only when a verified factor exists'
);

WITH protected(signature) AS (
  VALUES
    ('public.can_access_salon(uuid,uuid)'::text),
    ('public.get_user_salon_id(uuid)'::text),
    ('public.get_user_employee_id(uuid)'::text),
    ('public.has_role_in_salon(uuid,uuid,public.app_role)'::text),
    ('public.is_salon_admin(uuid)'::text),
    ('public.user_owns_barber(uuid,uuid)'::text),
    ('public.get_barber_owner(uuid)'::text),
    ('public.is_platform_admin()'::text)
)
SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM protected
    WHERE position(
      'mfa_session_is_sufficient'
      in pg_get_functiondef(to_regprocedure(signature))
    ) = 0
  ),
  'central identity and authorization helpers enforce MFA assurance'
);

SELECT pg_temp.assert_true(
  NOT has_function_privilege('public', 'public.mfa_session_is_sufficient()', 'EXECUTE'),
  'MFA assurance helper is not executable by PUBLIC'
);
