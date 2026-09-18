-- Live Schedule detection on X posts + cached schedule image in Storage

alter table mild_r.x_posts
  add column if not exists is_live_schedule boolean not null default false;

alter table mild_r.x_posts
  add column if not exists schedule_image_url text;

alter table mild_r.x_posts
  add column if not exists schedule_image_source_url text;

create index if not exists x_posts_live_schedule_posted_at_idx
  on mild_r.x_posts (posted_at desc nulls last)
  where is_live_schedule;

-- Public Storage bucket for X media (schedule posters, etc.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'x-media',
  'x-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read x-media" on storage.objects;
create policy "Public read x-media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'x-media');

drop policy if exists "Service role write x-media" on storage.objects;
create policy "Service role write x-media"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'x-media')
  with check (bucket_id = 'x-media');

drop view if exists public.mild_r_x_posts;
create view public.mild_r_x_posts
with (security_invoker = true)
as
select
  tweet_id,
  post_type,
  author_name,
  author_username,
  author_avatar,
  text,
  media_urls,
  posted_at,
  likes_count,
  retweets_count,
  is_quote,
  quoted_tweet,
  original_url,
  is_live_schedule,
  schedule_image_url,
  schedule_image_source_url,
  raw,
  created_at,
  updated_at
from mild_r.x_posts;

grant select on public.mild_r_x_posts to anon, authenticated;
grant all on public.mild_r_x_posts to service_role;

notify pgrst, 'reload schema';
