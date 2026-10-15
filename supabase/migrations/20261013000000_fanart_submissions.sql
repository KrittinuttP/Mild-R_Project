-- Fan art uploads (public form → admin approve). No public gallery yet.

create table if not exists mild_r.fanart_submissions (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  contact_channel text not null
    check (contact_channel in ('x', 'discord')),
  contact_handle text not null,
  art_path text not null,
  art_url text not null,
  avatar_path text,
  avatar_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'hidden')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  approved_at timestamptz,
  reviewed_at timestamptz
);

create index if not exists fanart_submissions_status_created_idx
  on mild_r.fanart_submissions (status, created_at desc);

alter table mild_r.fanart_submissions enable row level security;

grant usage on schema mild_r to service_role;
grant all on mild_r.fanart_submissions to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fanart-uploads',
  'fanart-uploads',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read fanart-uploads" on storage.objects;
create policy "Public read fanart-uploads"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'fanart-uploads');

drop policy if exists "Service role write fanart-uploads" on storage.objects;
create policy "Service role write fanart-uploads"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'fanart-uploads')
  with check (bucket_id = 'fanart-uploads');

drop view if exists public.mild_r_fanart_submissions;
create or replace view public.mild_r_fanart_submissions
with (security_invoker = true)
as
select
  id,
  display_name,
  contact_channel,
  contact_handle,
  art_path,
  art_url,
  avatar_path,
  avatar_url,
  status,
  created_at,
  approved_at,
  reviewed_at
from mild_r.fanart_submissions;

grant all on public.mild_r_fanart_submissions to service_role;

notify pgrst, 'reload schema';
