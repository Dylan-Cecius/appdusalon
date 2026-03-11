ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS daily_schedules jsonb DEFAULT '{
    "Monday": {"start": "09:00", "end": "19:00"},
    "Tuesday": {"start": "09:00", "end": "19:00"},
    "Wednesday": {"start": "09:00", "end": "19:00"},
    "Thursday": {"start": "09:00", "end": "19:00"},
    "Friday": {"start": "09:00", "end": "19:00"},
    "Saturday": {"start": "09:00", "end": "19:00"}
  }'::jsonb;

-- Migrate existing data: build daily_schedules from working_days + start_time + end_time
UPDATE public.staff
SET daily_schedules = (
  SELECT jsonb_object_agg(day, jsonb_build_object('start', start_time, 'end', end_time))
  FROM unnest(working_days) AS day
)
WHERE working_days IS NOT NULL AND array_length(working_days, 1) > 0;