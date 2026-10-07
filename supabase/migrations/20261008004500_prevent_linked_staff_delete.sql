-- V2: linked staff must have application access revoked before deletion.

CREATE OR REPLACE FUNCTION public.prevent_linked_staff_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.auth_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'revoke_staff_access_before_delete'
      USING ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS staff_prevent_linked_delete
  ON public.staff;

CREATE TRIGGER staff_prevent_linked_delete
BEFORE DELETE
ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.prevent_linked_staff_delete();
