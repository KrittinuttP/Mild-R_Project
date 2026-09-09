-- Run in Supabase SQL Editor AFTER deploying the youtube-tracker Edge Function.
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY (do not commit real keys).

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  perform cron.unschedule('run-youtube-step1-main');
exception when others then
  null;
end $$;

do $$
begin
  perform cron.unschedule('run-youtube-step2-search');
exception when others then
  null;
end $$;

-- Step 1: main channel every 30 minutes
select cron.schedule(
  'run-youtube-step1-main',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/youtube-tracker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{"action":"main"}'::jsonb
  ) as request_id;
  $$
);

-- Step 2: related search every 6h aligned to Bangkok midnight
-- BKK 00:00 / 06:00 / 12:00 / 18:00 → UTC 17 / 23 / 05 / 11
select cron.schedule(
  'run-youtube-step2-search',
  '0 5,11,17,23 * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/youtube-tracker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{"action":"search"}'::jsonb
  ) as request_id;
  $$
);

do $$
begin
  perform cron.unschedule('run-youtube-step3-refresh');
exception when others then
  null;
end $$;

-- Step 3: refresh views/likes every hour
select cron.schedule(
  'run-youtube-step3-refresh',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/youtube-tracker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{"action":"refresh"}'::jsonb
  ) as request_id;
  $$
);
