-- Fix the security warning by moving pgcrypto to extensions schema
DROP EXTENSION IF EXISTS pgcrypto;

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Install pgcrypto in the extensions schema
CREATE EXTENSION pgcrypto SCHEMA extensions;

-- Update the functions to use the extensions schema correctly
CREATE OR REPLACE FUNCTION public.hash_password(password_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'extensions', 'public'
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

-- Update verify_password function  
CREATE OR REPLACE FUNCTION public.verify_password(password_text text, password_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'extensions', 'public'
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