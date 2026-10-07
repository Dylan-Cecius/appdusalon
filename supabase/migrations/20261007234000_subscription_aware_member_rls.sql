-- V2: central salon membership access with subscription-aware employee gating.
-- Admins keep access to their salon on any plan. Employees require Equipe/Lifetime.

CREATE OR REPLACE FUNCTION public.can_access_salon(
  _user_id uuid,
  _salon_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_value public.app_role;
  owner_user_id_value uuid;
  owner_email_value text;
  subscriber_record record;
  normalized_tier text;
BEGIN
  IF _user_id IS NULL OR _salon_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role
  INTO role_value
  FROM public.user_roles
  WHERE user_id = _user_id
    AND salon_id = _salon_id
  ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END
  LIMIT 1;

  IF role_value IS NULL THEN
    RETURN false;
  END IF;

  IF role_value = 'admin' THEN
    RETURN true;
  END IF;

  SELECT owner_user_id
  INTO owner_user_id_value
  FROM public.salons
  WHERE id = _salon_id;

  IF owner_user_id_value IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(email)
  INTO owner_email_value
  FROM auth.users
  WHERE id = owner_user_id_value;

  IF owner_email_value IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.platform_admin_emails
    WHERE email = owner_email_value
  ) THEN
    RETURN true;
  END IF;

  SELECT subscribed, subscription_tier, subscription_end
  INTO subscriber_record
  FROM public.subscribers
  WHERE user_id = owner_user_id_value
     OR (
       owner_email_value IS NOT NULL
       AND lower(email) = owner_email_value
     )
  ORDER BY updated_at DESC
  LIMIT 1;

  IF COALESCE(subscriber_record.subscribed, false) = false THEN
    RETURN false;
  END IF;

  IF subscriber_record.subscription_end IS NOT NULL
     AND subscriber_record.subscription_end <= now() THEN
    RETURN false;
  END IF;

  normalized_tier := CASE subscriber_record.subscription_tier
    WHEN 'Pro' THEN 'Equipe'
    WHEN 'Enterprise' THEN 'Lifetime'
    ELSE subscriber_record.subscription_tier
  END;

  RETURN normalized_tier IN ('Equipe', 'Lifetime');
END;
$$;

REVOKE ALL ON FUNCTION public.can_access_salon(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_salon(uuid, uuid) TO authenticated;

-- Salon/member visibility
DROP POLICY IF EXISTS "Users can view their salon" ON public.salons;
CREATE POLICY "Members can view accessible salon"
ON public.salons
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), id));

DROP POLICY IF EXISTS "Users can view employees in their salon" ON public.employees;
CREATE POLICY "Members can view employees in accessible salon"
ON public.employees
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

DROP POLICY IF EXISTS "staff_salon_select" ON public.staff;
CREATE POLICY "staff_accessible_salon_select"
ON public.staff
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

-- Transactions
DROP POLICY IF EXISTS "Users can view transactions in their salon" ON public.transactions;
DROP POLICY IF EXISTS "Users can create transactions in their salon" ON public.transactions;

CREATE POLICY "Members can view permitted transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND (
    public.is_salon_admin(auth.uid())
    OR employee_id = public.get_user_employee_id(auth.uid())
  )
);

CREATE POLICY "Members can create transactions in accessible salon"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
);

-- Appointments
DROP POLICY IF EXISTS "Users can view appointments in their salon" ON public.appointments;
DROP POLICY IF EXISTS "Users can create appointments in their salon" ON public.appointments;
DROP POLICY IF EXISTS "Users can update appointments in their salon" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete appointments in their salon" ON public.appointments;

CREATE POLICY "Members can view appointments in accessible salon"
ON public.appointments
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

CREATE POLICY "Members can create appointments in accessible salon"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_salon(auth.uid(), salon_id));

CREATE POLICY "Members can update appointments in accessible salon"
ON public.appointments
FOR UPDATE
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id))
WITH CHECK (public.can_access_salon(auth.uid(), salon_id));

CREATE POLICY "Members can delete appointments in accessible salon"
ON public.appointments
FOR DELETE
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

-- Clients and team tasks remain collaborative for valid team members.
DROP POLICY IF EXISTS "Users can manage clients in their salon" ON public.clients;
CREATE POLICY "Members can manage clients in accessible salon"
ON public.clients
FOR ALL
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id))
WITH CHECK (public.can_access_salon(auth.uid(), salon_id));

DROP POLICY IF EXISTS "Users can manage todo items in their salon" ON public.todo_items;
CREATE POLICY "Members can manage todo in accessible salon"
ON public.todo_items
FOR ALL
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id))
WITH CHECK (public.can_access_salon(auth.uid(), salon_id));

DROP POLICY IF EXISTS "Users can manage custom blocks in their salon" ON public.custom_blocks;
CREATE POLICY "Members can manage blocks in accessible salon"
ON public.custom_blocks
FOR ALL
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id))
WITH CHECK (public.can_access_salon(auth.uid(), salon_id));

DROP POLICY IF EXISTS "Users can manage lunch breaks in their salon" ON public.lunch_breaks;
CREATE POLICY "Members can manage breaks in accessible salon"
ON public.lunch_breaks
FOR ALL
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id))
WITH CHECK (public.can_access_salon(auth.uid(), salon_id));

-- Services: members read, admins configure.
DROP POLICY IF EXISTS "Users can manage services in their salon" ON public.services;

CREATE POLICY "Members can view services in accessible salon"
ON public.services
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

CREATE POLICY "Admins can insert services"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can update services"
ON public.services
FOR UPDATE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
)
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can delete services"
ON public.services
FOR DELETE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

-- Products: members read for POS, admins configure.
DROP POLICY IF EXISTS "products_salon_access" ON public.products;

CREATE POLICY "Members can view products in accessible salon"
ON public.products
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
)
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

-- Stock movements: members can read sales effects, only admins can write manually.
DROP POLICY IF EXISTS "stock_movements_salon_access" ON public.stock_movements;

CREATE POLICY "Members can view stock movements in accessible salon"
ON public.stock_movements
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

CREATE POLICY "Admins can insert stock movements"
ON public.stock_movements
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can update stock movements"
ON public.stock_movements
FOR UPDATE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
)
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can delete stock movements"
ON public.stock_movements
FOR DELETE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

-- Opening hours: visible to valid members, configurable by admins.
DROP POLICY IF EXISTS "Users can manage opening hours in their salon" ON public.opening_hours;

CREATE POLICY "Members can view opening hours in accessible salon"
ON public.opening_hours
FOR SELECT
TO authenticated
USING (public.can_access_salon(auth.uid(), salon_id));

CREATE POLICY "Admins can insert opening hours"
ON public.opening_hours
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can update opening hours"
ON public.opening_hours
FOR UPDATE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
)
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can delete opening hours"
ON public.opening_hours
FOR DELETE
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);
