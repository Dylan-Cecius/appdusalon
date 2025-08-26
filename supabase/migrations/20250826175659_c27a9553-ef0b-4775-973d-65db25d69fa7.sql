-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create hash_password function for secure password hashing
CREATE OR REPLACE FUNCTION public.hash_password(password_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Use pgcrypto for secure password hashing
  RETURN crypt(password_text, gen_salt('bf', 10));
END;
$$;

-- Create verify_password function for password verification
CREATE OR REPLACE FUNCTION public.verify_password(password_text text, password_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify password against hash
  RETURN password_hash = crypt(password_text, password_hash);
END;
$$;