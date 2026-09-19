-- Template only — prefer: npm run cron:live-agent
-- Schedule: Agent Tue/Fri/Sun at 00:15 Asia/Bangkok
-- (= Mon/Thu/Sat 17:15 UTC → cron '15 17 * * 1,4,6')
-- Runs after x-feed-sync (00:00 BKK). Processes 1 pending row.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('run-live-schedule-agent');
exception when others then
  null;
end $$;

select cron.schedule(
  'run-live-schedule-agent',
  '15 17 * * 1,4,6',
  $$
  select net.http_post(
    url := 'https://YOUR_PUBLIC_SITE/api/live/agent/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_LIVE_AGENT_CRON_SECRET_OR_SERVICE_ROLE'
    ),
    body := '{"limit":1}'::jsonb
  ) as request_id;
  $$
);
