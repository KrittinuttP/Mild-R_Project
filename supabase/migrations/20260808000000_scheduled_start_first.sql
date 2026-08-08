-- Preserve first-seen scheduled time separately from latest YouTube scheduledStartTime

drop view if exists public.mild_r_live_streams;

alter table mild_r.live_streams
  add column if not exists scheduled_start_first timestamptz;

-- Seed existing rows from current scheduled_start
update mild_r.live_streams
set scheduled_start_first = scheduled_start
where scheduled_start_first is null
  and scheduled_start is not null;

create index if not exists live_streams_scheduled_start_first_idx
  on mild_r.live_streams (scheduled_start_first desc nulls last);

create or replace view public.mild_r_live_streams
with (security_invoker = true)
as
select
  video_id,
  channel_id,
  channel_name,
  title,
  url,
  scheduled_start,
  scheduled_start_first,
  actual_start,
  actual_end,
  thumbnail_url,
  views_on_end,
  latest_views,
  is_own_channel,
  is_collab,
  metadata,
  created_at
from mild_r.live_streams;

grant select on public.mild_r_live_streams to anon, authenticated;
grant all on public.mild_r_live_streams to service_role;

notify pgrst, 'reload schema';
