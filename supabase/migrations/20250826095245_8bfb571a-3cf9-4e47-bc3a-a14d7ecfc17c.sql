-- Clean up security vulnerabilities

-- Delete orphaned salon_settings records that can't be secured with RLS
DELETE FROM salon_settings WHERE user_id IS NULL;

-- Create a secure function for password hashing
CREATE OR REPLACE FUNCTION public.hash_password(password_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use pgcrypto for secure password hashing
  RETURN crypt(password_text, gen_salt('bf', 10));
END;
$$;

-- Create a secure function for password verification
CREATE OR REPLACE FUNCTION public.verify_password(password_text TEXT, password_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify password against hash
  RETURN password_hash = crypt(password_text, password_hash);
END;
$$;

-- Enable pgcrypto extension for secure password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add comment for security documentation
COMMENT ON FUNCTION public.hash_password(TEXT) IS 'Secure password hashing function using bcrypt';
COMMENT ON FUNCTION public.verify_password(TEXT, TEXT) IS 'Secure password verification function using bcrypt';