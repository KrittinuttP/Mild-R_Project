-- Moments gallery: X photos can be hidden per post from /admin/x-gallery.
-- The sync never sends gallery_hidden, so an upsert keeps the admin's choice.

alter table mild_r.x_posts
  add column if not exists gallery_hidden boolean not null default false;

-- Same view as 20260918160000_x_posts_live_schedule.sql + gallery_hidden.
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
  gallery_hidden,
  raw,
  created_at,
  updated_at
from mild_r.x_posts;

grant select on public.mild_r_x_posts to anon, authenticated;
grant all on public.mild_r_x_posts to service_role;

notify pgrst, 'reload schema';
