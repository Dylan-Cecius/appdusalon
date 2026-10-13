-- V2.1: run booking waitlist notification processor every 5 minutes.

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
  existing_job bigint;
BEGIN
  FOR existing_job IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'process-booking-waitlist'
  LOOP
    PERFORM cron.unschedule(existing_job);
  END LOOP;
END
$$;

SELECT cron.schedule(
  'process-booking-waitlist',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := COALESCE(
      (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'functions_base_url'
        LIMIT 1
      ),
      ''
    ) || '/functions/v1/process-booking-waitlist',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(
        (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'sms_cron_secret'
          LIMIT 1
        ),
        ''
      )
    ),
    body := jsonb_build_object('timestamp', now())
  );
  $cron$
);
