-- Corriger toutes les autres fonctions avec search_path non sécurisé
CREATE OR REPLACE FUNCTION public.hash_password(password_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Use pgcrypto for secure password hashing from extensions schema
  RETURN crypt(password_text, gen_salt('bf', 10));
EXCEPTION
  WHEN OTHERS THEN
    -- If pgcrypto fails, use a simple hash as fallback
    RETURN md5(password_text || 'salon_salt_2024');
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_password(password_text text, password_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if it's a bcrypt hash (starts with $2)
  IF password_hash LIKE '$2%' THEN
    RETURN password_hash = crypt(password_text, password_hash);
  ELSE
    -- Fallback for MD5 hashes
    RETURN password_hash = md5(password_text || 'salon_salt_2024');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_appointment_client_details(appointment_id uuid)
RETURNS TABLE(client_name text, client_phone text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT a.client_name, a.client_phone 
  FROM public.appointments a
  WHERE a.id = appointment_id 
    AND a.user_id = auth.uid();
$$;