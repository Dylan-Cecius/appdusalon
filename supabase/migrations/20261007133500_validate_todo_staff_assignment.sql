-- V2: enforce that todo staff assignments stay inside the task salon.

CREATE OR REPLACE FUNCTION public.validate_todo_staff_assignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.staff_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.salon_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.staff
    WHERE id = NEW.staff_id
      AND salon_id = NEW.salon_id
  ) THEN
    RAISE EXCEPTION 'invalid_staff_assignment'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS todo_validate_staff_assignment
  ON public.todo_items;

CREATE TRIGGER todo_validate_staff_assignment
BEFORE INSERT OR UPDATE OF staff_id, salon_id
ON public.todo_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_todo_staff_assignment();
