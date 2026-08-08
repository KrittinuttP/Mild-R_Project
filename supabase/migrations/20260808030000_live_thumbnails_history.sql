-- Thumbnail history (Supabase Storage) + public views
-- Status "cancelled" is computed in app (scheduled + 3h, no actual_start) — no DB column.

-- Current display URL (public Storage); YouTube source stays in thumbnail_url
alter table mild_r.live_streams
  add column if not exists thumbnail_cached_url text;

create table if not exists mild_r.live_stream_thumbnails (
  id uuid primary key default gen_random_uuid(),
  video_id text not null references mild_r.live_streams (video_id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  source_url text,
  captured_at timestamptz not null default timezone('utc'::text, now()),
  is_current boolean not null default false,
  unique (video_id, storage_path)
);

create index if not exists live_stream_thumbnails_video_id_idx
  on mild_r.live_stream_thumbnails (video_id, captured_at desc);

create index if not exists live_stream_thumbnails_current_idx
  on mild_r.live_stream_thumbnails (video_id)
  where is_current;

alter table mild_r.live_stream_thumbnails enable row level security;

drop policy if exists "Public read mild_r live_stream_thumbnails"
  on mild_r.live_stream_thumbnails;
create policy "Public read mild_r live_stream_thumbnails"
  on mild_r.live_stream_thumbnails
  for select
  to anon, authenticated
  using (true);

grant select on mild_r.live_stream_thumbnails to anon, authenticated;
grant all on mild_r.live_stream_thumbnails to service_role;

-- Storage bucket (public read; writes via service role)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'live-thumbs',
  'live-thumbs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read live-thumbs" on storage.objects;
create policy "Public read live-thumbs"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'live-thumbs');

drop policy if exists "Service role write live-thumbs" on storage.objects;
create policy "Service role write live-thumbs"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'live-thumbs')
  with check (bucket_id = 'live-thumbs');

drop view if exists public.mild_r_live_stream_thumbnails;
create or replace view public.mild_r_live_stream_thumbnails
with (security_invoker = true)
as
select
  id,
  video_id,
  storage_path,
  public_url,
  source_url,
  captured_at,
  is_current
from mild_r.live_stream_thumbnails;

grant select on public.mild_r_live_stream_thumbnails to anon, authenticated;
grant all on public.mild_r_live_stream_thumbnails to service_role;

drop view if exists public.mild_r_live_streams;
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
  metadata,
  created_at
from mild_r.live_streams;

grant select on public.mild_r_live_streams to anon, authenticated;
grant all on public.mild_r_live_streams to service_role;

notify pgrst, 'reload schema';
