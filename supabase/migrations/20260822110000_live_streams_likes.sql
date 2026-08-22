-- Locked first-seen likes + latest likes (mirrors views_on_end / latest_views)

drop view if exists public.mild_r_live_streams;

alter table mild_r.live_streams
  add column if not exists likes_on_end integer,
  add column if not exists latest_likes integer;

update mild_r.live_streams
set latest_likes = (metadata->>'likes')::integer
where latest_likes is null
  and metadata->>'likes' ~ '^[0-9]+$';

update mild_r.live_streams
set likes_on_end = latest_likes
where likes_on_end is null
  and actual_end is not null
  and latest_likes is not null;

create or replace view public.mild_r_live_streams
with (security_invoker = true)
as
select
  video_id,
  channel_id,
  channel_name,
  source_title,
  title,
  url,
  scheduled_start,
  scheduled_start_first,
  actual_start,
  actual_end,
  thumbnail_url,
  thumbnail_cached_url,
  views_on_end,
  latest_views,
  likes_on_end,
  latest_likes,
  is_own_channel,
  is_collab,
  project,
  metadata,
  created_at,
  updated_at
from mild_r.live_streams;

grant select on public.mild_r_live_streams to anon, authenticated;
grant all on public.mild_r_live_streams to service_role;

notify pgrst, 'reload schema';
