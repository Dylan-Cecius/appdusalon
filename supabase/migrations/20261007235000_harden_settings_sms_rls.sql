-- V2: finish subscription-aware access for settings and SMS tables.

DROP POLICY IF EXISTS "Members can view salon settings" ON public.salon_settings;

CREATE POLICY "Members can view accessible salon settings"
ON public.salon_settings
FOR SELECT
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
);

DROP POLICY IF EXISTS "sms_campaigns_salon_access" ON public.sms_campaigns;
DROP POLICY IF EXISTS "sms_logs_salon_access" ON public.sms_logs;

CREATE POLICY "Admins can manage SMS campaigns"
ON public.sms_campaigns
FOR ALL
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
)
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can view SMS logs"
ON public.sms_logs
FOR SELECT
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);

CREATE POLICY "Admins can manage SMS logs"
ON public.sms_logs
FOR ALL
TO authenticated
USING (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
)
WITH CHECK (
  public.can_access_salon(auth.uid(), salon_id)
  AND public.has_role_in_salon(auth.uid(), salon_id, 'admin')
);
