-- Cafe section visibility (reveal / top-secret toggles)
create table if not exists mild_r.cafe_section_visibility (
  section_key text primary key,
  visible boolean not null default true,
  label text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table mild_r.cafe_section_visibility enable row level security;

drop policy if exists "Public read mild_r cafe_section_visibility"
  on mild_r.cafe_section_visibility;
create policy "Public read mild_r cafe_section_visibility"
  on mild_r.cafe_section_visibility
  for select
  to anon, authenticated
  using (true);

grant usage on schema mild_r to anon, authenticated, service_role;
grant select on mild_r.cafe_section_visibility to anon, authenticated;
grant all on mild_r.cafe_section_visibility to service_role;

insert into mild_r.cafe_section_visibility (section_key, visible, label)
values
  ('dispatch', true, 'Window & Location'),
  ('plates', true, 'Photographic Plates'),
  ('daySchedule', true, 'Daily Schedule'),
  ('highlights', true, 'Intelligence Brief'),
  ('signatureMenu', true, 'Signature Menu'),
  ('venueMenu', true, 'Venue Menu'),
  ('goods', true, 'Goods'),
  ('closing', true, 'Closing Note')
on conflict (section_key) do nothing;

drop view if exists public.mild_r_cafe_section_visibility;
create view public.mild_r_cafe_section_visibility
with (security_invoker = true)
as
select
  section_key,
  visible,
  label,
  updated_at
from mild_r.cafe_section_visibility;

grant select on public.mild_r_cafe_section_visibility to anon, authenticated;
grant all on public.mild_r_cafe_section_visibility to service_role;

notify pgrst, 'reload schema';
