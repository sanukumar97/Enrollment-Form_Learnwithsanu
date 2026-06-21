-- Enables pg_net (HTTP calls from Postgres).
-- pg_cron is always on in Supabase by default.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove the job if it already exists (safe to re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-mails') THEN
    PERFORM cron.unschedule('process-scheduled-mails');
  END IF;
END;
$$;

-- !! REPLACE the two placeholders below before running:
--    YOUR_PROJECT_URL  → your VITE_SUPABASE_URL from .env.local  (e.g. https://abcxyz.supabase.co)
--    YOUR_SERVICE_ROLE_KEY → Supabase Dashboard → Settings → API → service_role key

SELECT cron.schedule(
  'process-scheduled-mails',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'YOUR_PROJECT_URL/functions/v1/process-scheduled-mails',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
