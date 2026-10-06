-- V2 platform-admin authorization
-- Move global admin authorization out of the browser and into Supabase.

CREATE TABLE IF NOT EXISTS public.platform_admin_emails (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_admin_email_lowercase CHECK (email = lower(email))
);

INSERT INTO public.platform_admin_emails (email)
VALUES ('dylan.cecius@gmail.com')
ON CONFLICT (email) DO NOTHING;

ALTER TABLE public.platform_admin_emails ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.platform_admin_emails FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admin_emails
    WHERE email = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

DROP POLICY IF EXISTS "Only Dylan can manage promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Platform admins can manage promo codes" ON public.promo_codes;

CREATE POLICY "Platform admins can manage promo codes"
ON public.promo_codes
FOR ALL
TO authenticated
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view promo usage" ON public.promo_code_usage;
CREATE POLICY "Platform admins can view promo usage"
ON public.promo_code_usage
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view profiles" ON public.profiles;
CREATE POLICY "Platform admins can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view subscribers" ON public.subscribers;
CREATE POLICY "Platform admins can view subscribers"
ON public.subscribers
FOR SELECT
TO authenticated
USING (public.is_platform_admin());
