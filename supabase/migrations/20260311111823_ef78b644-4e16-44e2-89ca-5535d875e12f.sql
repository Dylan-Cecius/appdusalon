
CREATE TABLE public.opening_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Monday, 6=Sunday
  is_open boolean NOT NULL DEFAULT true,
  open_time text NOT NULL DEFAULT '09:00',
  close_time text NOT NULL DEFAULT '19:00',
  break_start text,
  break_end text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(salon_id, day_of_week)
);

ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage opening hours in their salon"
  ON public.opening_hours
  FOR ALL
  TO authenticated
  USING (salon_id = get_user_salon_id(auth.uid()));
