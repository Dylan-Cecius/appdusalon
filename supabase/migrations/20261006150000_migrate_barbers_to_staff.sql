-- V2: consolidate legacy barbers into staff without deleting legacy records.
-- Staff becomes the canonical team source while historical barber_id values remain valid.

WITH legacy_barbers AS (
  SELECT
    b.*,
    COALESCE(
      b.salon_id,
      (
        SELECT s.id
        FROM public.salons s
        WHERE s.owner_user_id = b.user_id
        ORDER BY s.created_at
        LIMIT 1
      )
    ) AS target_salon_id
  FROM public.barbers b
)
INSERT INTO public.staff (
  salon_id,
  name,
  role,
  color,
  phone,
  email,
  commission_rate,
  is_active,
  start_time,
  end_time,
  working_days,
  daily_schedules
)
SELECT
  legacy.target_salon_id,
  legacy.name,
  'coiffeur',
  CASE legacy.color
    WHEN 'bg-blue-600' THEN '#2563EB'
    WHEN 'bg-purple-600' THEN '#9333EA'
    WHEN 'bg-green-600' THEN '#16A34A'
    WHEN 'bg-red-600' THEN '#DC2626'
    WHEN 'bg-yellow-600' THEN '#CA8A04'
    WHEN 'bg-pink-600' THEN '#DB2777'
    WHEN 'bg-indigo-600' THEN '#4F46E5'
    WHEN 'bg-orange-600' THEN '#EA580C'
    ELSE '#6366F1'
  END,
  NULL,
  NULL,
  0,
  legacy.is_active,
  legacy.start_time,
  legacy.end_time,
  COALESCE(
    legacy.working_days,
    ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']::text[]
  ),
  COALESCE(
    (
      SELECT jsonb_object_agg(
        day_name,
        jsonb_build_object('start', legacy.start_time, 'end', legacy.end_time)
      )
      FROM unnest(
        COALESCE(
          legacy.working_days,
          ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']::text[]
        )
      ) AS day_name
    ),
    '{}'::jsonb
  )
FROM legacy_barbers legacy
WHERE legacy.target_salon_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff staff
    WHERE staff.salon_id = legacy.target_salon_id
      AND lower(trim(staff.name)) = lower(trim(legacy.name))
  );

UPDATE public.appointments appointment
SET staff_id = staff.id
FROM public.barbers barber
JOIN public.staff staff
  ON lower(trim(staff.name)) = lower(trim(barber.name))
WHERE appointment.staff_id IS NULL
  AND appointment.barber_id = barber.id
  AND appointment.salon_id = staff.salon_id;
