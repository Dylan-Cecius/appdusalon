-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Create salons table
CREATE TABLE public.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-blue-600',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(salon_id, user_id)
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, salon_id, role)
);

-- Add salon_id and employee_id to transactions
ALTER TABLE public.transactions 
ADD COLUMN salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
ADD COLUMN employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Add salon_id and employee_id to appointments
ALTER TABLE public.appointments 
ADD COLUMN salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE,
ADD COLUMN employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Add salon_id to other relevant tables
ALTER TABLE public.barbers ADD COLUMN salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.services ADD COLUMN salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.clients ADD COLUMN salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.custom_blocks ADD COLUMN salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.lunch_breaks ADD COLUMN salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE;
ALTER TABLE public.todo_items ADD COLUMN salon_id UUID REFERENCES public.salons(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has a role in a salon
CREATE OR REPLACE FUNCTION public.has_role_in_salon(_user_id UUID, _salon_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND salon_id = _salon_id
      AND role = _role
  );
$$;

-- Create security definer function to get user's salon_id
CREATE OR REPLACE FUNCTION public.get_user_salon_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT salon_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Create security definer function to get user's employee_id
CREATE OR REPLACE FUNCTION public.get_user_employee_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.employees
  WHERE user_id = _user_id
    AND is_active = true
  LIMIT 1;
$$;

-- Create security definer function to check if user is admin in their salon
CREATE OR REPLACE FUNCTION public.is_salon_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  );
$$;

-- RLS Policies for salons
CREATE POLICY "Users can view their salon"
ON public.salons FOR SELECT
TO authenticated
USING (
  id = public.get_user_salon_id(auth.uid())
);

CREATE POLICY "Salon owners can update their salon"
ON public.salons FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid());

-- RLS Policies for employees
CREATE POLICY "Users can view employees in their salon"
ON public.employees FOR SELECT
TO authenticated
USING (salon_id = public.get_user_salon_id(auth.uid()));

CREATE POLICY "Admins can manage employees in their salon"
ON public.employees FOR ALL
TO authenticated
USING (
  public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles in their salon"
ON public.user_roles FOR ALL
TO authenticated
USING (
  public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

-- Update RLS policies for transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;

CREATE POLICY "Users can view transactions in their salon"
ON public.transactions FOR SELECT
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid()) AND
  (public.is_salon_admin(auth.uid()) OR employee_id = public.get_user_employee_id(auth.uid()))
);

CREATE POLICY "Users can create transactions in their salon"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
);

CREATE POLICY "Admins can update transactions in their salon"
ON public.transactions FOR UPDATE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid()) AND
  public.is_salon_admin(auth.uid())
);

CREATE POLICY "Admins can delete transactions in their salon"
ON public.transactions FOR DELETE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid()) AND
  public.is_salon_admin(auth.uid())
);

-- Update RLS policies for appointments
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;

CREATE POLICY "Users can view appointments in their salon"
ON public.appointments FOR SELECT
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
);

CREATE POLICY "Users can create appointments in their salon"
ON public.appointments FOR INSERT
TO authenticated
WITH CHECK (
  salon_id = public.get_user_salon_id(auth.uid())
);

CREATE POLICY "Users can update appointments in their salon"
ON public.appointments FOR UPDATE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
);

CREATE POLICY "Users can delete appointments in their salon"
ON public.appointments FOR DELETE
TO authenticated
USING (
  salon_id = public.get_user_salon_id(auth.uid())
);

-- Update RLS policies for other tables to use salon_id
DROP POLICY IF EXISTS "Users can manage their own barbers" ON public.barbers;
CREATE POLICY "Users can manage barbers in their salon"
ON public.barbers FOR ALL
TO authenticated
USING (salon_id = public.get_user_salon_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own services" ON public.services;
CREATE POLICY "Users can manage services in their salon"
ON public.services FOR ALL
TO authenticated
USING (salon_id = public.get_user_salon_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
CREATE POLICY "Users can manage clients in their salon"
ON public.clients FOR ALL
TO authenticated
USING (salon_id = public.get_user_salon_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own custom blocks" ON public.custom_blocks;
CREATE POLICY "Users can manage custom blocks in their salon"
ON public.custom_blocks FOR ALL
TO authenticated
USING (salon_id = public.get_user_salon_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own lunch breaks" ON public.lunch_breaks;
CREATE POLICY "Users can manage lunch breaks in their salon"
ON public.lunch_breaks FOR ALL
TO authenticated
USING (salon_id = public.get_user_salon_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own todo items" ON public.todo_items;
CREATE POLICY "Users can manage todo items in their salon"
ON public.todo_items FOR ALL
TO authenticated
USING (salon_id = public.get_user_salon_id(auth.uid()));

-- Trigger to update updated_at on salons
CREATE TRIGGER update_salons_updated_at
BEFORE UPDATE ON public.salons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on employees
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migration script: Create default salon for existing users and migrate barbers
DO $$
DECLARE
  user_record RECORD;
  new_salon_id UUID;
  barber_record RECORD;
BEGIN
  -- For each existing user with data, create a salon
  FOR user_record IN 
    SELECT DISTINCT user_id 
    FROM public.barbers 
    WHERE user_id IS NOT NULL
  LOOP
    -- Create salon for this user
    INSERT INTO public.salons (owner_user_id, name)
    VALUES (user_record.user_id, 'Mon Salon')
    RETURNING id INTO new_salon_id;
    
    -- Give admin role to the owner
    INSERT INTO public.user_roles (user_id, salon_id, role)
    VALUES (user_record.user_id, new_salon_id, 'admin');
    
    -- Update all barbers for this user with salon_id
    UPDATE public.barbers
    SET salon_id = new_salon_id
    WHERE user_id = user_record.user_id;
    
    -- Create employee record for the owner (as their own employee)
    INSERT INTO public.employees (salon_id, user_id, display_name, color, is_active)
    VALUES (new_salon_id, user_record.user_id, 'Propriétaire', 'bg-purple-600', true);
    
    -- Update all transactions for this user with salon_id
    UPDATE public.transactions
    SET salon_id = new_salon_id
    WHERE user_id = user_record.user_id;
    
    -- Update all appointments for this user with salon_id
    UPDATE public.appointments
    SET salon_id = new_salon_id
    WHERE user_id = user_record.user_id;
    
    -- Update all services for this user with salon_id
    UPDATE public.services
    SET salon_id = new_salon_id
    WHERE user_id = user_record.user_id;
    
    -- Update all clients for this user with salon_id
    UPDATE public.clients
    SET salon_id = new_salon_id
    WHERE user_id = user_record.user_id;
    
    -- Update all custom_blocks for this user with salon_id
    UPDATE public.custom_blocks
    SET salon_id = new_salon_id
    WHERE user_id = user_record.user_id;
    
    -- Update all lunch_breaks for this user with salon_id
    UPDATE public.lunch_breaks
    SET salon_id = new_salon_id
    WHERE user_id = user_record.user_id;
    
    -- Update all todo_items for this user with salon_id
    UPDATE public.todo_items
    SET salon_id = new_salon_id
    WHERE user_id = user_record.user_id;
  END LOOP;
END $$;