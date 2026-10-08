-- V2: secure scheduled Edge Function invocations through Supabase Vault.
-- Required Vault secrets:
--   functions_base_url -> e.g. https://<project-ref>.supabase.co
--   cron_secret        -> same value as Edge secret CRON_SECRET
--   sms_cron_secret    -> same value as Edge secret SMS_CRON_SECRET

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  existing_job bigint;
BEGIN
  FOR existing_job IN
    SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-reports'
  LOOP
    PERFORM cron.unschedule(existing_job);
  END LOOP;

  FOR existing_job IN
    SELECT jobid FROM cron.job WHERE jobname = 'process-sms-automations'
  LOOP
    PERFORM cron.unschedule(existing_job);
  END LOOP;

  FOR existing_job IN
    SELECT jobid FROM cron.job WHERE jobname = 'check-appointment-reminders'
  LOOP
    PERFORM cron.unschedule(existing_job);
  END LOOP;
END
$;

SELECT cron.schedule(
  'process-scheduled-reports',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := COALESCE(
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1),
      ''
    ) || '/functions/v1/process-scheduled-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1),
        ''
      )
    ),
    body := jsonb_build_object('timestamp', now())
  );
  $cron$
);

-- Run hourly; the Edge Function itself only sends birthday/reactivation messages
-- during the 08:00 Europe/Brussels window. This stays DST-safe.
SELECT cron.schedule(
  'process-sms-automations',
  '5 * * * *',
  $cron$
  SELECT net.http_post(
    url := COALESCE(
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1),
      ''
    ) || '/functions/v1/process-sms-automations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sms_cron_secret' LIMIT 1),
        ''
      )
    ),
    body := jsonb_build_object('timestamp', now())
  );
  $cron$
);


-- Run hourly so each appointment enters its configured reminder window
-- with at most one hour of scheduler delay. The Edge Function deduplicates
-- per appointment via sms_logs.
SELECT cron.schedule(
  'check-appointment-reminders',
  '10 * * * *',
  $cron$
  SELECT net.http_post(
    url := COALESCE(
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1),
      ''
    ) || '/functions/v1/check-appointment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sms_cron_secret' LIMIT 1),
        ''
      )
    ),
    body := jsonb_build_object('timestamp', now())
  );
  $cron$
);
