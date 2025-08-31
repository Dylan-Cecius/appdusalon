-- Add salon owner validation to prevent cross-salon data access
-- This ensures appointments can only be accessed by their respective salon owners

-- Create a security definer function to check if a user owns a specific barber
CREATE OR REPLACE FUNCTION public.user_owns_barber(target_barber_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbers 
    WHERE id = target_barber_id 
    AND user_id = target_user_id
    AND is_active = true
  );
$$;

-- Create a function to get user_id from barber_id (for service functions)
CREATE OR REPLACE FUNCTION public.get_barber_owner(target_barber_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT user_id FROM public.barbers 
  WHERE id = target_barber_id 
  AND is_active = true
  LIMIT 1;
$$;