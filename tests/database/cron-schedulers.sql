\set ON_ERROR_STOP on

CREATE OR REPLACE FUNCTION pg_temp.assert_true(p_ok boolean, p_label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'FAIL: %', p_label;
  END IF;
  RAISE NOTICE 'PASS: %', p_label;
END $$;

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault'
  ),
  'Supabase Vault is installed before schedulers use it'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'process-scheduled-reports'
      AND schedule = '*/15 * * * *'
      AND command LIKE '%cron_secret%'
      AND command LIKE '%process-scheduled-reports%'
  ),
  'scheduled reports cron is installed with Vault secret'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'process-sms-automations'
      AND schedule = '5 * * * *'
      AND command LIKE '%sms_cron_secret%'
      AND command LIKE '%process-sms-automations%'
  ),
  'SMS automations cron is installed with Vault secret'
);

SELECT pg_temp.assert_true(
  EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'check-appointment-reminders'
      AND schedule = '10 * * * *'
      AND command LIKE '%sms_cron_secret%'
      AND command LIKE '%check-appointment-reminders%'
  ),
  'appointment reminders cron is installed with Vault secret'
);

SELECT pg_temp.assert_true(
  NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname IN (
      'process-scheduled-reports',
      'process-sms-automations',
      'check-appointment-reminders'
    )
    GROUP BY jobname
    HAVING count(*) > 1
  ),
  'secure scheduler jobs are not duplicated'
);
