-- Cover changes are detected by image content: YouTube keeps the same thumbnail URL
-- (…/vi/<id>/hqdefault.jpg) when a cover is replaced, so comparing URLs never sees it.
-- youtube-tracker stores the SHA-256 of each archived cover here; rows from before this
-- migration stay null and get their hash the first time the tracker compares against them.

alter table mild_r.live_stream_thumbnails
  add column if not exists content_hash text;

-- Appending a column keeps the existing view columns in place.
create or replace view public.mild_r_live_stream_thumbnails
with (security_invoker = true)
as
select
  id,
  video_id,
  storage_path,
  public_url,
  source_url,
  captured_at,
  is_current,
  content_hash
from mild_r.live_stream_thumbnails;

grant select on public.mild_r_live_stream_thumbnails to anon, authenticated;
grant all on public.mild_r_live_stream_thumbnails to service_role;

notify pgrst, 'reload schema';
