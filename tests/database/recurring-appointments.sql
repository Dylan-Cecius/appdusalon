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
      AND table_name = 'appointments'
      AND column_name = 'recurrence_group_id'
  ),
  'appointments expose recurrence group metadata'
);

SELECT pg_temp.assert_true(
  to_regprocedure(
    'public.create_recurring_appointments(text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer)'
  ) IS NOT NULL,
  'atomic recurring appointment RPC exists'
);

SELECT pg_temp.assert_true(
  position(
    'occurrences_param < 2'
    in pg_get_functiondef(
      'public.create_recurring_appointments(text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer)'::regprocedure
    )
  ) > 0,
  'recurring RPC validates occurrence count'
);

SELECT pg_temp.assert_true(
  position(
    'recurrence_group_id'
    in pg_get_functiondef(
      'public.create_recurring_appointments(text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer)'::regprocedure
    )
  ) > 0,
  'recurring RPC stores series identity'
);

SELECT pg_temp.assert_true(
  NOT has_function_privilege(
    'public',
    'public.create_recurring_appointments(text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer)',
    'EXECUTE'
  ),
  'recurring RPC is not executable by PUBLIC'
);
