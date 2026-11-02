-- Optional Discord username the fan gives as a backup contact.
-- Empty for submissions made before the field existed.

alter table mild_r.fanart_submissions
  add column if not exists contact_discord text;

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
  consent_version,
  credit_type,
  credit_value,
  thumb_path,
  thumb_url,
  contact_discord
from mild_r.fanart_submissions;

grant all on public.mild_r_fanart_submissions to service_role;

notify pgrst, 'reload schema';
