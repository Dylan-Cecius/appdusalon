-- V2: move todo assignments from legacy barbers to canonical staff.

ALTER TABLE public.todo_items
  ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

UPDATE public.todo_items todo
SET staff_id = staff.id
FROM public.barbers barber
JOIN public.staff staff
  ON staff.salon_id = barber.salon_id
 AND lower(trim(staff.name)) = lower(trim(barber.name))
WHERE todo.staff_id IS NULL
  AND todo.barber_id = barber.id;

ALTER TABLE public.todo_items
  ALTER COLUMN barber_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS todo_items_staff_id_idx
  ON public.todo_items (staff_id);

COMMENT ON COLUMN public.todo_items.barber_id IS
  'Legacy V1 assignment. V2 uses staff_id.';
