-- Mild-R X (Twitter) posts — twitterapi.io → Edge sync → Next.js reads view
create schema if not exists mild_r;

create table if not exists mild_r.x_posts (
  tweet_id text primary key,
  post_type text not null check (post_type in ('tweet', 'quote', 'retweet')),
  author_name text,
  author_username text,
  author_avatar text,
  text text,
  media_urls text[] not null default '{}',
  posted_at timestamp with time zone,
  likes_count integer,
  retweets_count integer,
  is_quote boolean not null default false,
  quoted_tweet jsonb,
  original_url text,
  raw jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists x_posts_posted_at_idx
  on mild_r.x_posts (posted_at desc nulls last);

create index if not exists x_posts_post_type_idx
  on mild_r.x_posts (post_type);

alter table mild_r.x_posts enable row level security;

drop policy if exists "Public read mild_r x_posts" on mild_r.x_posts;
create policy "Public read mild_r x_posts"
  on mild_r.x_posts
  for select
  to anon, authenticated
  using (true);

grant usage on schema mild_r to anon, authenticated, service_role;
grant select on mild_r.x_posts to anon, authenticated;
grant all on mild_r.x_posts to service_role;

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
  raw,
  created_at,
  updated_at
from mild_r.x_posts;

grant select on public.mild_r_x_posts to anon, authenticated;
grant all on public.mild_r_x_posts to service_role;

notify pgrst, 'reload schema';
