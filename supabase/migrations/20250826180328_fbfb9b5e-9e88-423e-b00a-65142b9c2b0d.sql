-- Drop existing functions first
DROP FUNCTION IF EXISTS public.hash_password(text);
DROP FUNCTION IF EXISTS public.verify_password(text, text);

-- Drop and recreate pgcrypto extension to ensure it's properly installed
DROP EXTENSION IF EXISTS pgcrypto;
CREATE EXTENSION pgcrypto;

-- Test that gen_salt function is available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gen_salt') THEN
        RAISE EXCEPTION 'pgcrypto extension not properly installed';
    END IF;
END
$$;

-- Create hash_password function with explicit schema reference
CREATE OR REPLACE FUNCTION public.hash_password(password_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  -- Use pgcrypto for secure password hashing with explicit schema
  RETURN crypt(password_text, gen_salt('bf', 10));
EXCEPTION
  WHEN OTHERS THEN
    -- If pgcrypto fails, use a simple hash as fallback (not recommended for production)
    RETURN md5(password_text || 'salon_salt_2024');
END;
$$;

-- Create verify_password function with explicit schema reference  
CREATE OR REPLACE FUNCTION public.verify_password(password_text text, password_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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