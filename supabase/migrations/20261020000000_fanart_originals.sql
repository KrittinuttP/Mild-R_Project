-- Fan art originals for printing + multi-image batches + consent record.
-- Browsers upload originals straight to the private bucket with a signed URL
-- (Vercel functions cap request bodies at 4.5 MB). The server then makes the
-- 2048 px WebP copy in fanart-uploads for the admin screen.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fanart-originals',
  'fanart-originals',
  false,
  15728640, -- 15 MB
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Service role all fanart-originals" on storage.objects;
create policy "Service role all fanart-originals"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'fanart-originals')
  with check (bucket_id = 'fanart-originals');

alter table mild_r.fanart_submissions
  add column if not exists original_path text,
  add column if not exists original_bytes integer,
  add column if not exists original_type text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists batch_id uuid,
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text;

-- One row per uploaded original: makes a retried submit safe.
create unique index if not exists fanart_submissions_original_path_key
  on mild_r.fanart_submissions (original_path)
  where original_path is not null;

create index if not exists fanart_submissions_batch_idx
  on mild_r.fanart_submissions (batch_id);

drop view if exists public.mild_r_fanart_submissions;
create view public.mild_r_fanart_submissions
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
  reviewed_at,
  original_path,
  original_bytes,
  original_type,
  width,
  height,
  batch_id,
  consent_at,
  consent_version
from mild_r.fanart_submissions;

grant all on public.mild_r_fanart_submissions to service_role;

-- Bytes stored across every bucket (the Free plan quota is project-wide).
-- The upload API stops taking new fan art before the quota runs out.
create or replace function public.mild_r_storage_used_bytes()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects o
$$;

revoke all on function public.mild_r_storage_used_bytes() from public, anon, authenticated;
grant execute on function public.mild_r_storage_used_bytes() to service_role;

notify pgrst, 'reload schema';
