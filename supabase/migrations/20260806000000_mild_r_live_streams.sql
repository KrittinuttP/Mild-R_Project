-- Mild-R schema (shared Supabase project; isolate from other apps)
create schema if not exists mild_r;

create table if not exists mild_r.live_streams (
  video_id text primary key,
  channel_name text,
  title text,
  url text,
  scheduled_start timestamp with time zone,
  actual_start timestamp with time zone,
  actual_end timestamp with time zone,
  thumbnail_url text,
  views_on_end integer,
  latest_views integer,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists live_streams_scheduled_start_idx
  on mild_r.live_streams (scheduled_start desc nulls last);

create index if not exists live_streams_actual_start_idx
  on mild_r.live_streams (actual_start desc nulls last);

alter table mild_r.live_streams enable row level security;

-- Public read for fanclub site (Vercel anon key)
drop policy if exists "Public read mild_r live_streams" on mild_r.live_streams;
create policy "Public read mild_r live_streams"
  on mild_r.live_streams
  for select
  to anon, authenticated
  using (true);

-- Writes only via service role (bypasses RLS)
grant usage on schema mild_r to anon, authenticated, service_role;
grant select on mild_r.live_streams to anon, authenticated;
grant all on mild_r.live_streams to service_role;

-- Public view so PostgREST works without Extra schemas dashboard toggle
create or replace view public.mild_r_live_streams
with (security_invoker = true)
as
select
  video_id,
  channel_name,
  title,
  url,
  scheduled_start,
  actual_start,
  actual_end,
  thumbnail_url,
  views_on_end,
  latest_views,
  metadata,
  created_at
from mild_r.live_streams;

grant select on public.mild_r_live_streams to anon, authenticated;
grant all on public.mild_r_live_streams to service_role;

notify pgrst, 'reload schema';
