
-- Table staff
CREATE TABLE public.staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'coiffeur',
  color TEXT NOT NULL DEFAULT '#8B5CF6',
  phone TEXT,
  email TEXT,
  commission_rate INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_salon_select" ON public.staff
  FOR SELECT
  USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "staff_salon_admin_all" ON public.staff
  FOR ALL
  USING (public.has_role_in_salon(auth.uid(), salon_id, 'admin'));

-- Add staff_id to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

-- Add staff_id to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;
