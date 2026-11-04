-- Cafe page · Notice Board (posts from X @Mild_Honeycomb) + Case Tapes (YouTube @Mild-HoneycombProject).
-- Filled by the edge function `cafe-feed-sync` (cron 00:00 Asia/Bangkok + "ดึงตอนนี้" in /cafe/settings).
-- Section on/off switches use the existing cafe_section_visibility rows `notices` / `tapes`.
begin;

create table if not exists mild_r.cafe_x_posts (
  tweet_id text primary key,
  text text not null default '',
  media_urls text[] not null default '{}',
  url text,
  posted_at timestamptz not null,
  hidden boolean not null default false,
  pinned boolean not null default false,
  fetched_at timestamptz not null default now()
);
create index if not exists cafe_x_posts_posted_at_idx on mild_r.cafe_x_posts (posted_at desc);
-- One pinned post at most.
create unique index if not exists cafe_x_posts_one_pinned on mild_r.cafe_x_posts (pinned) where pinned;

create table if not exists mild_r.cafe_tapes (
  video_id text primary key,
  title text not null default '',
  published_at timestamptz not null,
  duration_seconds integer,
  is_short boolean not null default false,
  thumbnail_url text,
  hidden boolean not null default false,
  fetched_at timestamptz not null default now()
);
create index if not exists cafe_tapes_published_at_idx on mild_r.cafe_tapes (published_at desc);

create table if not exists mild_r.cafe_feed_state (
  feed text primary key check (feed in ('x', 'youtube')),
  auto_sync boolean not null default true,
  last_synced_at timestamptz,
  last_count integer,
  last_error text,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into mild_r.cafe_feed_state (feed) values ('x'), ('youtube') on conflict (feed) do nothing;

alter table mild_r.cafe_x_posts enable row level security;
alter table mild_r.cafe_tapes enable row level security;
alter table mild_r.cafe_feed_state enable row level security;

drop policy if exists "Public read mild_r cafe_x_posts" on mild_r.cafe_x_posts;
create policy "Public read mild_r cafe_x_posts" on mild_r.cafe_x_posts
  for select to anon, authenticated using (true);
drop policy if exists "Public read mild_r cafe_tapes" on mild_r.cafe_tapes;
create policy "Public read mild_r cafe_tapes" on mild_r.cafe_tapes
  for select to anon, authenticated using (true);

grant select on mild_r.cafe_x_posts, mild_r.cafe_tapes to anon, authenticated;
grant all on mild_r.cafe_x_posts, mild_r.cafe_tapes, mild_r.cafe_feed_state to service_role;

create or replace view public.mild_r_cafe_x_posts with (security_invoker = true) as
  select tweet_id, text, media_urls, url, posted_at, hidden, pinned, fetched_at from mild_r.cafe_x_posts;
create or replace view public.mild_r_cafe_tapes with (security_invoker = true) as
  select video_id, title, published_at, duration_seconds, is_short, thumbnail_url, hidden, fetched_at from mild_r.cafe_tapes;
create or replace view public.mild_r_cafe_feed_state with (security_invoker = true) as
  select feed, auto_sync, last_synced_at, last_count, last_error, meta, updated_at from mild_r.cafe_feed_state;

grant select on public.mild_r_cafe_x_posts, public.mild_r_cafe_tapes to anon, authenticated;
grant all on public.mild_r_cafe_x_posts, public.mild_r_cafe_tapes, public.mild_r_cafe_feed_state to service_role;

-- New sections start visible (they hide themselves while empty).
insert into mild_r.cafe_section_visibility (section_key, visible, label)
values ('notices', true, 'Notice Board'), ('tapes', true, 'Case Tapes')
on conflict (section_key) do nothing;

commit;

notify pgrst, 'reload schema';
