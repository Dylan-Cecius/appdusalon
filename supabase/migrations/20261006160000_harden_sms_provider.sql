-- V2 SMS hardening:
-- platform-managed Twilio credentials live in Edge Function secrets, never in salon-readable rows.

ALTER TABLE public.sms_logs
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sms_logs_appointment_id_idx
  ON public.sms_logs (appointment_id)
  WHERE appointment_id IS NOT NULL;

UPDATE public.sms_settings
SET twilio_account_sid = NULL,
    twilio_auth_token = NULL,
    twilio_phone_number = NULL
WHERE twilio_account_sid IS NOT NULL
   OR twilio_auth_token IS NOT NULL
   OR twilio_phone_number IS NOT NULL;

COMMENT ON COLUMN public.sms_settings.twilio_account_sid IS
  'Legacy column. V2 uses server-side TWILIO_ACCOUNT_SID secret.';
COMMENT ON COLUMN public.sms_settings.twilio_auth_token IS
  'Legacy column. V2 uses server-side TWILIO_AUTH_TOKEN secret.';
COMMENT ON COLUMN public.sms_settings.twilio_phone_number IS
  'Legacy column. V2 uses server-side TWILIO_PHONE_NUMBER secret.';
