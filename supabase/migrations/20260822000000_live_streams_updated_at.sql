-- Track last row mutation (sync / manual edit) for ops trends UI

drop view if exists public.mild_r_live_streams;

alter table mild_r.live_streams
  add column if not exists updated_at timestamp with time zone
    default timezone('utc'::text, now()) not null;

update mild_r.live_streams
set updated_at = created_at;

create or replace function mild_r.live_streams_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists live_streams_set_updated_at on mild_r.live_streams;

create trigger live_streams_set_updated_at
  before update on mild_r.live_streams
  for each row
  execute function mild_r.live_streams_set_updated_at();

create index if not exists live_streams_updated_at_idx
  on mild_r.live_streams (updated_at desc nulls last);

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
