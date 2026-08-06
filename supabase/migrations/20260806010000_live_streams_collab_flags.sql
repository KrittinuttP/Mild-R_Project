-- Add own-channel / collab classification for YouTube lives

drop view if exists public.mild_r_live_streams;

alter table mild_r.live_streams
  add column if not exists channel_id text,
  add column if not exists is_own_channel boolean not null default false,
  add column if not exists is_collab boolean not null default false;

create index if not exists live_streams_is_own_channel_idx
  on mild_r.live_streams (is_own_channel);

create index if not exists live_streams_is_collab_idx
  on mild_r.live_streams (is_collab);

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
