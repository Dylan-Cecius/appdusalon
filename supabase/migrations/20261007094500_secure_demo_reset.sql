-- V2: restrict demo reset to the authenticated owner of the demo salon.
-- The function stays SECURITY DEFINER because it must rebuild demo data,
-- but it now refuses calls from any other account.

CREATE OR REPLACE FUNCTION public.assert_demo_owner()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_owner uuid;
BEGIN
  SELECT owner_user_id
  INTO demo_owner
  FROM public.salons
  WHERE is_demo = true
  ORDER BY created_at
  LIMIT 1;

  IF demo_owner IS NULL THEN
    RAISE EXCEPTION 'demo_salon_not_found';
  END IF;

  IF auth.uid() IS NULL OR auth.uid() <> demo_owner THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN demo_owner;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_demo_owner() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_demo_owner() TO authenticated;

-- Rename the current implementation, then expose a guarded wrapper.
-- If the migration is replayed, only do the rename when the internal function
-- does not already exist.
DO $$
BEGIN
  IF to_regprocedure('public.reset_demo_data_internal()') IS NULL
     AND to_regprocedure('public.reset_demo_data()') IS NOT NULL THEN
    ALTER FUNCTION public.reset_demo_data() RENAME TO reset_demo_data_internal;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_data_internal() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.reset_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_demo_owner();
  PERFORM public.reset_demo_data_internal();
END;
$$;

REVOKE ALL ON FUNCTION public.reset_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;
