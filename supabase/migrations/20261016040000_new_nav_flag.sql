-- New five-tab navigation (docs/nav-redesign.md), behind its own rollout switch. Starts off
-- for everyone; turn it on for chosen kids with
--   update feature_flags set mode = 'allowlist', allowlist = '{<child id>,<child id>}'
--   where key = 'new_nav';
-- and back off with mode = 'off'. Additive only: one row in feature_flags.
insert into public.feature_flags (key) values ('new_nav') on conflict (key) do nothing;
