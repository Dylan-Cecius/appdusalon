-- Fix function search path security issues

-- Update hash_password function with secure search path
CREATE OR REPLACE FUNCTION public.hash_password(password_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Use pgcrypto for secure password hashing
  RETURN crypt(password_text, gen_salt('bf', 10));
END;
$$;

-- Update verify_password function with secure search path
CREATE OR REPLACE FUNCTION public.verify_password(password_text TEXT, password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify password against hash
  RETURN password_hash = crypt(password_text, password_hash);
END;
$$;