-- Non-live YouTube uploads (videos, Shorts, Premieres): Mild-R channel + clips on other channels that mention Mild-R.
-- Lives stay in mild_r.live_streams.

create table if not exists mild_r.videos (
  video_id text primary key,
  channel_id text,
  channel_name text,
  source_title text,
  title text,
  url text,
  kind text not null default 'video'
    check (kind in ('video', 'short', 'premiere')),
  published_at timestamp with time zone,
  duration_seconds integer,
  thumbnail_url text,
  latest_views integer,
  latest_likes integer,
  is_own_channel boolean not null default false,
  embeddable boolean not null default true,
  hidden boolean not null default false,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists videos_published_at_idx
  on mild_r.videos (published_at desc nulls last);

create index if not exists videos_kind_published_at_idx
  on mild_r.videos (kind, published_at desc nulls last);

create or replace function mild_r.videos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists videos_set_updated_at on mild_r.videos;

create trigger videos_set_updated_at
  before update on mild_r.videos
  for each row
  execute function mild_r.videos_set_updated_at();

alter table mild_r.videos enable row level security;

drop policy if exists "Public read mild_r videos" on mild_r.videos;
create policy "Public read mild_r videos"
  on mild_r.videos
  for select
  to anon, authenticated
  using (not hidden);

grant select on mild_r.videos to anon, authenticated;
grant all on mild_r.videos to service_role;

create or replace view public.mild_r_videos
with (security_invoker = true)
as
select
  video_id,
  channel_id,
  channel_name,
  source_title,
  title,
  url,
  kind,
  published_at,
  duration_seconds,
  thumbnail_url,
  latest_views,
  latest_likes,
  is_own_channel,
  embeddable,
  hidden,
  metadata,
  created_at,
  updated_at
from mild_r.videos;

grant select on public.mild_r_videos to anon, authenticated;
grant all on public.mild_r_videos to service_role;

notify pgrst, 'reload schema';
