-- HD live covers from X announcement posts (YouTube link + one 16:9 photo), cached in Storage

create table if not exists mild_r.live_stream_x_covers (
  video_id text primary key,
  tweet_id text not null,
  source_url text not null,
  width integer,
  height integer,
  storage_path text not null,
  public_url text not null,
  thumb_url text not null,
  posted_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists live_stream_x_covers_tweet_id_idx
  on mild_r.live_stream_x_covers (tweet_id);

alter table mild_r.live_stream_x_covers enable row level security;

drop policy if exists "Public read mild_r live_stream_x_covers"
  on mild_r.live_stream_x_covers;
create policy "Public read mild_r live_stream_x_covers"
  on mild_r.live_stream_x_covers
  for select
  to anon, authenticated
  using (true);

grant select on mild_r.live_stream_x_covers to anon, authenticated;
grant all on mild_r.live_stream_x_covers to service_role;

drop view if exists public.mild_r_live_stream_x_covers;
create view public.mild_r_live_stream_x_covers
with (security_invoker = true)
as
select
  video_id,
  tweet_id,
  source_url,
  width,
  height,
  storage_path,
  public_url,
  thumb_url,
  posted_at,
  created_at,
  updated_at
from mild_r.live_stream_x_covers;

grant select on public.mild_r_live_stream_x_covers to anon, authenticated;
grant all on public.mild_r_live_stream_x_covers to service_role;

notify pgrst, 'reload schema';
