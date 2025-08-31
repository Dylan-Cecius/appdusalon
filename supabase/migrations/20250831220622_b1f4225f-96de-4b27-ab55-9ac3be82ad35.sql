-- Enable the pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job to process scheduled reports every 15 minutes
SELECT cron.schedule(
  'process-scheduled-reports',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://vrawwiqeutbqqdzkhrax.supabase.co/functions/v1/process-scheduled-reports',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyYXd3aXFldXRicXFkemtocmF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjA0MDEsImV4cCI6MjA3MTczNjQwMX0.TnKumTl96ixa3D5hX0caknjh4DlwPU24PG9m-4hBJjY"}'::jsonb,
        body:='{"timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);