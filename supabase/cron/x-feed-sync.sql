-- Template only — prefer: npm run cron:x
-- Schedule: incremental every hour on the hour (cron '0 * * * *')
-- Do NOT schedule backfill.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('run-x-feed-incremental');
exception when others then
  null;
end $$;

select cron.schedule(
  'run-x-feed-incremental',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/x-feed-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{"action":"incremental"}'::jsonb
  ) as request_id;
  $$
);
