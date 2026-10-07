-- An earlier migration already creates this trigger. Recreate it explicitly
-- so a complete migration replay does not fail with duplicate_object.
-- The scheduling function and BEFORE INSERT OR UPDATE behavior are unchanged.
DROP TRIGGER IF EXISTS trigger_set_next_send_date ON public.automated_reports;

CREATE TRIGGER trigger_set_next_send_date
  BEFORE INSERT OR UPDATE ON public.automated_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_next_send_date();
