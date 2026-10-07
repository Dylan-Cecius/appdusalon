-- V2: repair partially provisioned salon owners from legacy signup flows.

INSERT INTO public.user_roles (
  user_id,
  salon_id,
  role
)
SELECT
  salons.owner_user_id,
  salons.id,
  'admin'::public.app_role
FROM public.salons salons
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_roles roles
  WHERE roles.user_id = salons.owner_user_id
    AND roles.salon_id = salons.id
    AND roles.role = 'admin'
)
ON CONFLICT (user_id, salon_id, role) DO NOTHING;

INSERT INTO public.salon_settings (
  salon_id,
  user_id,
  name
)
SELECT
  salons.id,
  salons.owner_user_id,
  salons.name
FROM public.salons salons
WHERE NOT EXISTS (
  SELECT 1
  FROM public.salon_settings settings
  WHERE settings.salon_id = salons.id
);

INSERT INTO public.opening_hours (
  salon_id,
  day_of_week,
  is_open,
  open_time,
  close_time
)
SELECT
  salons.id,
  days.day_index,
  days.day_index <> 6,
  '09:00',
  '19:00'
FROM public.salons salons
CROSS JOIN generate_series(0, 6) AS days(day_index)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.opening_hours hours
  WHERE hours.salon_id = salons.id
    AND hours.day_of_week = days.day_index
);
