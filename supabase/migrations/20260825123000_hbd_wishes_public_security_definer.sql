-- Public wishes view runs as owner so anon need not read base table (contact stays private)
drop view if exists public.mild_r_hbd_wishes_public;
create or replace view public.mild_r_hbd_wishes_public
with (security_invoker = false)
as
select
  id,
  display_name,
  message,
  card_url,
  avatar_url,
  status,
  created_at,
  approved_at
from mild_r.hbd_submissions
where status = 'approved';

grant select on public.mild_r_hbd_wishes_public to anon, authenticated;
grant all on public.mild_r_hbd_wishes_public to service_role;

notify pgrst, 'reload schema';
