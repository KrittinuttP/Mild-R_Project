-- Keep contact private: anon/authenticated only use public wishes view
revoke select on public.mild_r_hbd_submissions from anon, authenticated;
grant select on public.mild_r_hbd_submissions to service_role;
grant all on public.mild_r_hbd_submissions to service_role;

revoke select on mild_r.hbd_submissions from anon, authenticated;
grant select on mild_r.hbd_submissions to service_role;
grant all on mild_r.hbd_submissions to service_role;

drop policy if exists "Public read approved hbd_submissions"
  on mild_r.hbd_submissions;

notify pgrst, 'reload schema';
