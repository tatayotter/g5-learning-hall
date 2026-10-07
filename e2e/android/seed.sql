-- Fixture for e2e/android/run.cjs: two Grade 5 players (PINs 1234 and 5678), offline play on,
-- two content weeks from this one, a curio and potions.
begin;
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1'::text::uuid, 'authenticated', 'authenticated', 'parent@example.test', '', now(), now(), now(), '{}', '{}')
on conflict do nothing;
commit;
begin;
insert into public.parents (id, full_name, status, approved_at) values ('00000000-0000-0000-0000-0000000000a1', 'Parent One', 'approved', now()) on conflict do nothing;
insert into public.children (id, parent_id, username, pin_hash, full_name, grade, gender, school_name, avatar)
values ('playerone', '00000000-0000-0000-0000-0000000000a1', 'playerone', extensions.crypt('1234', extensions.gen_salt('bf')), 'Alpha Player', 'Grade 5', 'boy', 'Sample School', '/userpics/boy1.png')
on conflict do nothing;
insert into public.feature_flags (key, mode, allowlist) values ('offline_play', 'allowlist', array['playerone'])
on conflict (key) do update set mode = 'allowlist', allowlist = array['playerone'];

-- Content: this week (Mathematics every weekday) and next week (Science on Tuesday).
insert into public.content_weeks (id, grade, week_starting_date, status) values
  ('00000000-0000-0000-0000-00000000c001', 5, date_trunc('week', current_date + 1)::date - 1, 'published'),
  ('00000000-0000-0000-0000-00000000c002', 5, date_trunc('week', current_date + 1)::date + 6, 'published');
insert into public.content_days (id, content_week_id, weekday)
select ('00000000-0000-0000-0000-' || lpad('d' || n, 12, '0'))::uuid, '00000000-0000-0000-0000-00000000c001', d
from (values (1, 'Monday'), (2, 'Tuesday'), (3, 'Wednesday'), (4, 'Thursday'), (5, 'Friday')) v(n, d);
insert into public.content_days (id, content_week_id, weekday) values ('00000000-0000-0000-0000-00000000d099', '00000000-0000-0000-0000-00000000c002', 'Tuesday');
insert into public.content_quizzes (id, content_day_id, subject)
select ('00000000-0000-0000-0000-' || lpad('e' || n, 12, '0'))::uuid, ('00000000-0000-0000-0000-' || lpad('d' || n, 12, '0'))::uuid, 'Mathematics' from generate_series(1, 5) n;
insert into public.content_quizzes (id, content_day_id, subject) values ('00000000-0000-0000-0000-00000000e099', '00000000-0000-0000-0000-00000000d099', 'Science');
insert into public.content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select ('00000000-0000-0000-0000-' || lpad('e' || n, 12, '0'))::uuid, p.prompt, p.options, p.answer, p.ord
from generate_series(1, 5) n
cross join (values ('What is 2+2?', '["3","4"]'::jsonb, '4', 1), ('What is 2+3?', '["5","6"]'::jsonb, '5', 2)) p(prompt, options, answer, ord);
insert into public.content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
values ('00000000-0000-0000-0000-00000000e099', 'What is 2+4?', '["6","7"]', '6', 1);

-- The player.
insert into public.player_progress (user_id, level, xp, gold) values ('playerone', 7, 123, 4567)
on conflict (user_id) do update set level = 7, xp = 123, gold = 4567;
insert into public.user_last_login (user_id, onboarding_completed_at) values ('playerone', '2026-01-01') on conflict do nothing;
insert into public.user_monsters (id, user_id, monster_id, nickname, monster_exp, monster_level, slot, equipped_skills, acquired_via, quality)
values ('aaaa0000-0000-0000-0000-000000000001', 'playerone', 'shadrak', 'Shady', 1100, 12, 1, array['shadow_claw', null, null], 'starter', 'normal');
insert into public.user_battle_state (user_id, active_monster_slot, map_x, map_y, seen_monsters, defeated_trainers)
values ('playerone', 1, 10, 10, array['shadrak'], '{}');
insert into public.player_inventory (app_user_id, item_key, quantity) values ('playerone', 'health_potion', 3);
commit;

-- A second player on the same device.
begin;
insert into public.children (id, parent_id, username, pin_hash, full_name, grade, gender, school_name, avatar)
values ('playertwo', '00000000-0000-0000-0000-0000000000a1', 'playertwo', extensions.crypt('5678', extensions.gen_salt('bf')), 'Bravo Player', 'Grade 5', 'girl', 'Sample School', '/userpics/girl1.png');
insert into public.player_progress (user_id, level, xp, gold) values ('playertwo', 7, 10, 1000);
insert into public.user_last_login (user_id, onboarding_completed_at) values ('playertwo', '2026-01-01');
insert into public.user_monsters (id, user_id, monster_id, nickname, monster_exp, monster_level, slot, equipped_skills, acquired_via, quality)
values ('aaaa0000-0000-0000-0000-000000000002', 'playertwo', 'shadrak', 'Shade', 1100, 12, 1, array['shadow_claw', null, null], 'starter', 'normal');
insert into public.user_battle_state (user_id, active_monster_slot, map_x, map_y, seen_monsters, defeated_trainers)
values ('playertwo', 1, 10, 10, array['shadrak'], '{}');
commit;
