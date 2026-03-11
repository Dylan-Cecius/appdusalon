ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS start_time text NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS end_time text NOT NULL DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS working_days text[] DEFAULT '{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday}'::text[];