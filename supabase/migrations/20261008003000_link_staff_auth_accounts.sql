-- V2: link operational staff rows to invited application accounts.

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS staff_auth_user_id_unique
  ON public.staff (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- Best-effort backfill for employee accounts created before the canonical link.
UPDATE public.staff staff_row
SET auth_user_id = matched.user_id
FROM (
  SELECT DISTINCT ON (staff.id)
    staff.id AS staff_id,
    employees.user_id
  FROM public.staff staff
  JOIN public.employees employees
    ON employees.salon_id = staff.salon_id
   AND employees.is_active = true
  LEFT JOIN auth.users auth_user
    ON auth_user.id = employees.user_id
  WHERE staff.auth_user_id IS NULL
    AND (
      lower(trim(staff.name)) = lower(trim(employees.display_name))
      OR (
        staff.email IS NOT NULL
        AND auth_user.email IS NOT NULL
        AND lower(trim(staff.email)) = lower(trim(auth_user.email))
      )
    )
  ORDER BY staff.id, employees.created_at
) matched
WHERE staff_row.id = matched.staff_id
  AND staff_row.auth_user_id IS NULL;
