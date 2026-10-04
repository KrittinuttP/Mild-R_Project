-- Template only — prefer: npm run cron:live-agent
-- Schedule: Agent every hour at :05 (cron '5 * * * *')
-- Runs 5 minutes after the hourly x-feed-sync (:00). Each run takes 1 pending
-- poster, else 1 failed poster whose next_retry_at has passed. Silent when idle.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('run-live-schedule-agent');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.unschedule('run-live-schedule-agent-retry');
exception when others then
  null;
end $$;

select cron.schedule(
  'run-live-schedule-agent',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PUBLIC_SITE/api/live/agent/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_LIVE_AGENT_CRON_SECRET_OR_SERVICE_ROLE'
    ),
    body := '{"limit":1,"quietWhenIdle":true}'::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);
