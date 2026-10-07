-- V2: indexes for scheduled SMS automation lookups.

CREATE INDEX IF NOT EXISTS sms_logs_automation_lookup_idx
  ON public.sms_logs (salon_id, type, client_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS clients_birthday_lookup_idx
  ON public.clients (salon_id, birth_date)
  WHERE birth_date IS NOT NULL AND COALESCE(sms_opt_out, false) = false;

CREATE INDEX IF NOT EXISTS transactions_client_activity_idx
  ON public.transactions (salon_id, client_id, transaction_date DESC)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS appointments_phone_activity_idx
  ON public.appointments (salon_id, client_phone, start_time DESC)
  WHERE client_phone IS NOT NULL;
