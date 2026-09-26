-- Agent retry: failed posters are retried with backoff until they pass.
-- next_retry_at null on a failed row = permanent failure (no auto retry).

alter table mild_r.x_live_schedules
  add column if not exists attempt_count integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_retry_at timestamptz;

update mild_r.x_live_schedules
set
  attempt_count = greatest(attempt_count, 1),
  last_attempt_at = coalesce(last_attempt_at, agent_processed_at),
  next_retry_at = timezone('utc'::text, now())
where status = 'failed'
  and next_retry_at is null
  and coalesce(error_message, '') <> 'Missing image_url';

create index if not exists x_live_schedules_retry_idx
  on mild_r.x_live_schedules (status, next_retry_at)
  where status = 'failed';

drop view if exists public.mild_r_x_live_schedules;
create view public.mild_r_x_live_schedules
with (security_invoker = true)
as
select
  id,
  tweet_id,
  image_url,
  image_source_url,
  posted_at,
  schedule_week_start,
  added_at,
  agent_processed_at,
  status,
  parsed_json,
  error_message,
  attempt_count,
  last_attempt_at,
  next_retry_at,
  created_at,
  updated_at
from mild_r.x_live_schedules;

grant select on public.mild_r_x_live_schedules to anon, authenticated;
grant all on public.mild_r_x_live_schedules to service_role;

notify pgrst, 'reload schema';
