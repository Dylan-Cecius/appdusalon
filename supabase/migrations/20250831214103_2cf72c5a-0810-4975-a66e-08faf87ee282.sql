-- Corriger les dernières fonctions avec search_path non sécurisé
CREATE OR REPLACE FUNCTION public.user_owns_barber(target_barber_id uuid, target_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.barbers 
    WHERE id = target_barber_id 
    AND user_id = target_user_id
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_barber_owner(target_barber_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT user_id FROM public.barbers 
  WHERE id = target_barber_id 
  AND is_active = true
  LIMIT 1;
$$;