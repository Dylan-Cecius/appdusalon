-- Add working_days column to barbers table
ALTER TABLE public.barbers ADD COLUMN working_days TEXT[] DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}';

-- Add comment to explain the column
COMMENT ON COLUMN public.barbers.working_days IS 'Array of working days (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)';