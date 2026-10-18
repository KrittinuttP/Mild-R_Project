-- Cafe page lock (doc/cafe-countdown.md · E)
-- key / value so another page can be locked later without a schema change.
--   phase     auto | countdown | teaser | open   (auto = follow the times)
--   hunt      auto | open | locked               (auto = open with the cafe)
--   teaser_at ISO time, CD1 → CD2
--   open_at   ISO time, CD2 → cafe
create table if not exists mild_r.cafe_gate (
  key text primary key,
  value text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table mild_r.cafe_gate enable row level security;

drop policy if exists "Public read mild_r cafe_gate" on mild_r.cafe_gate;
create policy "Public read mild_r cafe_gate"
  on mild_r.cafe_gate
  for select
  to anon, authenticated
  using (true);

grant usage on schema mild_r to anon, authenticated, service_role;
grant select on mild_r.cafe_gate to anon, authenticated;
grant all on mild_r.cafe_gate to service_role;

insert into mild_r.cafe_gate (key, value)
values
  ('phase', 'auto'),
  ('hunt', 'auto'),
  ('teaser_at', '2026-10-23T18:12:00+07:00'),
  ('open_at', '2026-10-30T18:12:00+07:00')
on conflict (key) do nothing;

drop view if exists public.mild_r_cafe_gate;
create view public.mild_r_cafe_gate
with (security_invoker = true)
as
select key, value, updated_at
from mild_r.cafe_gate;

grant select on public.mild_r_cafe_gate to anon, authenticated;
grant all on public.mild_r_cafe_gate to service_role;

notify pgrst, 'reload schema';
