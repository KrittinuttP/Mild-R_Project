-- Moments gallery: photos uploaded by the admin at /admin/moments.
-- Sorted by created_at (when the photo entered the system) together with X photos.
-- Files live in the public bucket `moment-photos`:
--   incoming/<uuid>.<ext>  original from the browser (removed after processing)
--   art/<id>.webp          2048 px copy (lightbox)
--   thumbs/<id>.webp       720 px copy (grid)

create table if not exists mild_r.moment_photos (
  id uuid primary key default gen_random_uuid(),
  art_path text not null,
  art_url text not null,
  thumb_path text not null,
  thumb_url text not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  alt text not null default '',
  credit text not null default 'Mild-R',
  hidden boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists moment_photos_created_idx
  on mild_r.moment_photos (created_at desc);

alter table mild_r.moment_photos enable row level security;

drop policy if exists "Public read visible mild_r moment_photos" on mild_r.moment_photos;
create policy "Public read visible mild_r moment_photos"
  on mild_r.moment_photos
  for select
  to anon, authenticated
  using (hidden = false);

grant usage on schema mild_r to anon, authenticated, service_role;
grant select on mild_r.moment_photos to anon, authenticated;
grant all on mild_r.moment_photos to service_role;

-- Public list for the Moments page: visible photos only.
drop view if exists public.mild_r_moment_photos;
create view public.mild_r_moment_photos
with (security_invoker = true)
as
select
  id,
  art_url,
  thumb_url,
  width,
  height,
  alt,
  credit,
  created_at
from mild_r.moment_photos
where hidden = false;

grant select on public.mild_r_moment_photos to anon, authenticated;
grant all on public.mild_r_moment_photos to service_role;

-- Admin list + writes (hidden rows included): service role only.
drop view if exists public.mild_r_moment_photos_admin;
create view public.mild_r_moment_photos_admin
with (security_invoker = true)
as
select
  id,
  art_path,
  art_url,
  thumb_path,
  thumb_url,
  width,
  height,
  alt,
  credit,
  hidden,
  created_at,
  updated_at
from mild_r.moment_photos;

revoke all on public.mild_r_moment_photos_admin from anon, authenticated;
grant all on public.mild_r_moment_photos_admin to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'moment-photos',
  'moment-photos',
  true,
  26214400,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read moment-photos" on storage.objects;
create policy "Public read moment-photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'moment-photos');

drop policy if exists "Service role write moment-photos" on storage.objects;
create policy "Service role write moment-photos"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'moment-photos')
  with check (bucket_id = 'moment-photos');

notify pgrst, 'reload schema';
