-- HBD wish submissions (fan upload → admin approve → /hbd gallery)

create table if not exists mild_r.hbd_submissions (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  message text,
  contact_channel text not null
    check (contact_channel in ('x', 'discord')),
  contact_handle text not null,
  card_path text not null,
  card_url text not null,
  avatar_path text,
  avatar_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  approved_at timestamptz,
  reviewed_at timestamptz
);

create index if not exists hbd_submissions_status_created_idx
  on mild_r.hbd_submissions (status, created_at desc);

alter table mild_r.hbd_submissions enable row level security;

drop policy if exists "Public read approved hbd_submissions"
  on mild_r.hbd_submissions;
create policy "Public read approved hbd_submissions"
  on mild_r.hbd_submissions
  for select
  to anon, authenticated
  using (status = 'approved');

grant usage on schema mild_r to anon, authenticated, service_role;
grant select on mild_r.hbd_submissions to anon, authenticated;
grant all on mild_r.hbd_submissions to service_role;

-- Storage: public read, service-role write
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hbd-uploads',
  'hbd-uploads',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read hbd-uploads" on storage.objects;
create policy "Public read hbd-uploads"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'hbd-uploads');

drop policy if exists "Service role write hbd-uploads" on storage.objects;
create policy "Service role write hbd-uploads"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'hbd-uploads')
  with check (bucket_id = 'hbd-uploads');

drop view if exists public.mild_r_hbd_submissions;
create or replace view public.mild_r_hbd_submissions
with (security_invoker = true)
as
select
  id,
  display_name,
  message,
  contact_channel,
  contact_handle,
  card_path,
  card_url,
  avatar_path,
  avatar_url,
  status,
  created_at,
  approved_at,
  reviewed_at
from mild_r.hbd_submissions;

grant select on public.mild_r_hbd_submissions to anon, authenticated;
grant all on public.mild_r_hbd_submissions to service_role;

notify pgrst, 'reload schema';
