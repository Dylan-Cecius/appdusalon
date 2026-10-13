-- Keep each occurrence at the salon's wall-clock time across DST changes.
-- This is the same timezone used by booking availability and the agenda composer.
-- The function-local setting is restored on return; caller sessions stay unchanged.
ALTER FUNCTION public.create_recurring_appointments(
  text,text,jsonb,timestamptz,timestamptz,uuid,text,text,integer,integer
) SET timezone = 'Europe/Brussels';
