
-- Fix 1: Restrict sms_settings to admin-only access
DROP POLICY IF EXISTS "sms_settings_salon_access" ON public.sms_settings;

CREATE POLICY "sms_settings_admin_only"
ON public.sms_settings
FOR ALL
TO authenticated
USING (
  salon_id = get_user_salon_id(auth.uid())
  AND has_role_in_salon(auth.uid(), salon_id, 'admin')
);

-- Fix 2: Restrict promo_code_usage INSERT to authenticated users with user_id check
DROP POLICY IF EXISTS "System can insert usage records" ON public.promo_code_usage;

CREATE POLICY "Authenticated users can insert own usage records"
ON public.promo_code_usage
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
