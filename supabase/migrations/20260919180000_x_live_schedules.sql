-- Agent Live Schedule registry: cached posters + processing status (history)

create table if not exists mild_r.x_live_schedules (
  id uuid primary key default gen_random_uuid(),
  tweet_id text not null unique,
  image_url text,
  image_source_url text,
  posted_at timestamptz,
  added_at timestamptz not null default timezone('utc'::text, now()),
  agent_processed_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'imported', 'skipped', 'failed')),
  parsed_json jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists x_live_schedules_posted_at_idx
  on mild_r.x_live_schedules (posted_at desc nulls last);

create index if not exists x_live_schedules_status_added_at_idx
  on mild_r.x_live_schedules (status, added_at desc);

create index if not exists x_live_schedules_added_at_idx
  on mild_r.x_live_schedules (added_at desc);

alter table mild_r.x_live_schedules enable row level security;

drop policy if exists "Public read mild_r x_live_schedules"
  on mild_r.x_live_schedules;
create policy "Public read mild_r x_live_schedules"
  on mild_r.x_live_schedules
  for select
  to anon, authenticated
  using (true);

grant select on mild_r.x_live_schedules to anon, authenticated;
grant all on mild_r.x_live_schedules to service_role;

drop view if exists public.mild_r_x_live_schedules;
create view public.mild_r_x_live_schedules
with (security_invoker = true)
as
select
  id,
  tweet_id,
  image_url,
  image_source_url,
  posted_at,
  added_at,
  agent_processed_at,
  status,
  parsed_json,
  error_message,
  created_at,
  updated_at
from mild_r.x_live_schedules;

grant select on public.mild_r_x_live_schedules to anon, authenticated;
grant all on public.mild_r_x_live_schedules to service_role;

notify pgrst, 'reload schema';
