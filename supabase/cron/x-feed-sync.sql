-- Template only — prefer: npm run cron:x
-- Schedule: incremental every 3 days at 00:00 Asia/Bangkok (= 17:00 UTC)
-- Do NOT schedule backfill.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('run-x-feed-incremental');
exception when others then
  null;
end $$;

-- BKK midnight every 3 calendar days → UTC 17:00
select cron.schedule(
  'run-x-feed-incremental',
  '0 17 */3 * *',
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
