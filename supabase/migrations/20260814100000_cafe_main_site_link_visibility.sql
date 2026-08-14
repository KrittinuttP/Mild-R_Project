-- Nav chrome: show/hide "เว็บหลัก →" in cafe header
insert into mild_r.cafe_section_visibility (section_key, visible, label)
values ('mainSiteLink', true, 'Main Site Link')
on conflict (section_key) do nothing;

notify pgrst, 'reload schema';
