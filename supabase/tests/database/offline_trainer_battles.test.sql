-- pgTAP tests for 20261007000000_offline_trainer_battles.sql: sync_offline_trainer_battle's
-- re-grading, the checks on the trainer, level, items used and the hidden battle log, the win
-- threshold, the reward EXP on the player's own curio, and one-time apply per entry id.

begin;
create extension if not exists pgtap;
select plan(36);

-- ── Fixture ──────────────────────────────────────────────────────────────────
create temp table fx as
select
  gen_random_uuid() as auth_a, 'pgtap_offtr_a_' || substr(md5(random()::text), 1, 8) as user_a,
  gen_random_uuid() as auth_b, 'pgtap_offtr_b_' || substr(md5(random()::text), 1, 8) as user_b;

insert into user_identity_map (auth_uid, app_user_id)
select auth_a, user_a from fx
union all
select auth_b, user_b from fx;

insert into content_weeks (grade, week_starting_date) values (5, '2030-03-10');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-03-10';
insert into content_quizzes (content_day_id, subject)
select d.id, 'Mathematics' from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-03-10';
insert into content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
select q.id, n || '+1?', jsonb_build_array((n + 1)::text, (n + 2)::text), (n + 1)::text, n
from content_quizzes q
join content_days d on d.id = q.content_day_id
join content_weeks w on w.id = d.content_week_id
cross join generate_series(1, 8) as n
where w.grade = 5 and w.week_starting_date = '2030-03-10';

-- q1..q8, whose right answers are '2'..'9'.
create temp table qs as
select cq.sort_order as n, cq.id
from content_questions cq
join content_quizzes qz on qz.id = cq.content_quiz_id
join content_days d on d.id = qz.content_day_id
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-03-10';

create or replace function pg_temp.answers(p_right int, p_wrong int) returns jsonb as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'question_id', id,
    'selected', case when n <= p_right then (n + 1)::text else 'nope' end
  ) order by n), '[]'::jsonb)
  from qs where n <= p_right + p_wrong;
$$ language sql;

alter table fx add column curio_a uuid, add column curio_b uuid;
insert into user_monsters (user_id, monster_id, monster_exp, monster_level, slot)
select user_a, 'shadrak', 80, 1, 1 from fx
union all
select user_b, 'shadrak', 0, 1, 1 from fx;
update fx set
  curio_a = (select id from user_monsters where user_id = fx.user_a),
  curio_b = (select id from user_monsters where user_id = fx.user_b);

-- Player A is level 6 and has one item.
insert into player_progress (user_id, level) select user_a, 6 from fx;
insert into player_inventory (app_user_id, item_key, quantity) select user_a, 'pgtap_potion', 1 from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- A battle log (lib/battleLog.ts) that knocks out each trainer curio of `p_hp` with hits of at
-- most `p_hit`, one question per hit, using q1, q2, ... in order.
create or replace function pg_temp.win_log(p_hp int[], p_curio uuid, p_hit int default 700) returns jsonb as $$
declare
  v_log jsonb := '[]'::jsonb;
  v_q int := 1;
  v_hp int;
  v_dmg int;
begin
  for i in 1..cardinality(p_hp) loop
    v_hp := p_hp[i];
    while v_hp > 0 loop
      v_dmg := least(p_hit, v_hp);
      v_log := v_log || jsonb_build_array(jsonb_build_object(
        't', 'attack', 'curio', p_curio, 'skill', 'shadow_claw',
        'questions', jsonb_build_array((select id from qs where n = v_q)),
        'damage', v_dmg, 'npc', i - 1, 'hpBefore', v_hp, 'hpAfter', v_hp - v_dmg));
      v_hp := v_hp - v_dmg;
      v_q := v_q + 1;
    end loop;
  end loop;
  return v_log;
end;
$$ language plpgsql;

create or replace function pg_temp.sync(p_trainer text, p_curio uuid, p_answers jsonb, p_items jsonb, p_log jsonb,
  p_entry uuid default gen_random_uuid(), p_won boolean default true, p_at timestamptz default now()) returns jsonb as $$
  select public.sync_offline_trainer_battle((select user_a from fx), p_entry, p_trainer, p_curio, p_answers, p_items, p_log, p_won, p_at);
$$ language sql;

create temp table hp (trainer text primary key, hp int[]);
insert into hp values
  ('forest_scout', array[130, 116, 124]),
  ('tide_watcher', array[140, 178, 156]),
  ('tatay', array[1249, 1249, 1249]);

select ok(
  not has_function_privilege('anon', 'public.sync_offline_trainer_battle(text, uuid, text, uuid, jsonb, jsonb, jsonb, boolean, timestamptz)', 'execute'),
  'anon cannot call sync_offline_trainer_battle'
);

select pg_temp.login_as(auth_a) from fx;

-- ── A real win ───────────────────────────────────────────────────────────────
create temp table w1 as
select pg_temp.sync('forest_scout', curio_a, pg_temp.answers(3, 1), '[]',
  pg_temp.win_log((select hp from hp where trainer = 'forest_scout'), curio_a),
  '00000000-0000-0000-0000-0000000000e1', true, now() - interval '1 hour') as res
from fx;

select is((select (res ->> 'won')::boolean from w1), true, 'three right out of four, with a log that adds up, beats a three-curio trainer');
select is((select res ->> 'log_problem' from w1), null, 'the log has no problem');
select is((select (res ->> 'exp')::int from w1), 50, 'the EXP is the trainer''s own reward');
select is(
  (select array[monster_exp, monster_level] from user_monsters where id = (select curio_a from fx)),
  array[130, 2],
  'the reward lands on the curio as a delta and levels it'
);
select is(
  (select defeated_trainers from user_battle_state where user_id = (select user_a from fx)),
  array['forest_scout'],
  'the trainer is marked defeated'
);
select is(
  (select monster_battles_won_total from player_progress where user_id = (select user_a from fx)),
  1,
  'the win counts toward battles won'
);
select is(
  (select count(*)::int from user_completed_questions where user_id = (select user_a from fx) and quest_type = 'monster_arena'),
  4,
  'every question asked is marked done for the Arena'
);
select is(
  (select jsonb_array_length(log) from offline_battle_logs where entry_id = '00000000-0000-0000-0000-0000000000e1'),
  3,
  'the log is kept'
);

-- ── Replay ───────────────────────────────────────────────────────────────────
create temp table r1 as
select pg_temp.sync('forest_scout', curio_a, pg_temp.answers(3, 1), '[]', '[]', '00000000-0000-0000-0000-0000000000e1') as res
from fx;
select is((select (res ->> 'replayed')::boolean from r1), true, 'retrying the same battle returns the stored result');
select is(
  (select count(*)::int from offline_battle_logs where entry_id = '00000000-0000-0000-0000-0000000000e1'),
  1,
  'a retried battle keeps one log'
);
select is(
  (select monster_exp from user_monsters where id = (select curio_a from fx)),
  130,
  'a retried battle adds no EXP'
);

-- ── A second win over the same trainer ───────────────────────────────────────
select pg_temp.sync('forest_scout', curio_a, pg_temp.answers(4, 0), '[]',
  pg_temp.win_log((select hp from hp where trainer = 'forest_scout'), curio_a)) from fx;
select is(
  (select defeated_trainers from user_battle_state where user_id = (select user_a from fx)),
  array['forest_scout'],
  'beating a trainer again doesn''t list it twice'
);

-- ── Claimed wins that don't hold up ──────────────────────────────────────────
select is(
  (select (pg_temp.sync('tide_watcher', curio_a, pg_temp.answers(2, 0), '[]',
    pg_temp.win_log((select hp from hp where trainer = 'tide_watcher'), curio_a)) ->> 'won')::boolean from fx),
  false,
  'two right answers can''t beat three curios'
);
select is(
  (select (pg_temp.sync('tide_watcher', curio_a, pg_temp.answers(3, 4), '[]',
    pg_temp.win_log((select hp from hp where trainer = 'tide_watcher'), curio_a)) ->> 'won')::boolean from fx),
  false,
  'a win needs at least half the answers right'
);
select is(
  (select (pg_temp.sync('ember_acolyte', curio_a, pg_temp.answers(4, 0), '[]', '[]') ->> 'won')::boolean from fx),
  false,
  'a trainer above the player''s level is never a win'
);
select is(
  (select (pg_temp.sync('tatay', curio_a, pg_temp.answers(6, 0), '[]',
    pg_temp.win_log((select hp from hp where trainer = 'tatay'), curio_a)) ->> 'won')::boolean from fx),
  true,
  'a trainer never battled online can be beaten offline'
);

-- ── The battle log ───────────────────────────────────────────────────────────
select is(
  (select pg_temp.sync('forest_scout', curio_a, pg_temp.answers(4, 0), '[]', '[]') ->> 'log_problem' from fx),
  'trainer curio 0 wasn''t knocked out',
  'a claimed win with no log doesn''t count'
);
select is(
  (select pg_temp.sync('forest_scout', curio_a, pg_temp.answers(3, 3), '[]',
    -- q4 (the first wrong answer) as the first hit's question.
    jsonb_set(pg_temp.win_log((select hp from hp where trainer = 'forest_scout'), curio_a),
      '{0,questions}', jsonb_build_array((select id from qs where n = 4)))) ->> 'log_problem' from fx),
  'damage with no correct answer',
  'a hit needs a right answer'
);
select is(
  (select pg_temp.sync('forest_scout', curio_a, pg_temp.answers(4, 0), '[]',
    jsonb_set(pg_temp.win_log((select hp from hp where trainer = 'forest_scout'), curio_a),
      '{1,questions}', jsonb_build_array((select id from qs where n = 1)))) ->> 'log_problem' from fx),
  'one answer used for two attacks',
  'one answer can''t power two hits'
);
select is(
  (select pg_temp.sync('forest_scout', curio_a, pg_temp.answers(4, 0), '[]',
    pg_temp.win_log(array[5000, 116, 124], curio_a, 5000)) ->> 'log_problem' from fx),
  'hit too big for the curio''s level',
  'a hit bigger than the curio could do doesn''t count'
);
select is(
  (select pg_temp.sync('forest_scout', curio_a, pg_temp.answers(4, 0), '[]',
    pg_temp.win_log(array[60, 116, 124], curio_a)) ->> 'log_problem' from fx),
  'trainer curio 0 started below its full HP',
  'a trainer curio can''t start the battle hurt'
);
select is(
  (select pg_temp.sync('forest_scout', curio_a, pg_temp.answers(4, 0), '[]',
    jsonb_set(pg_temp.win_log((select hp from hp where trainer = 'forest_scout'), curio_a), '{1,hpAfter}', '10')) ->> 'log_problem' from fx),
  'trainer curio 1 HP doesn''t match the damage',
  'the HP has to go down by the damage'
);
select is(
  (select pg_temp.sync('forest_scout', curio_b, pg_temp.answers(4, 0), '[]',
    pg_temp.win_log((select hp from hp where trainer = 'forest_scout'), curio_b)) ->> 'log_problem' from fx),
  'attack by a curio that isn''t the player''s',
  'the attacks have to come from the player''s own curios'
);

-- ── Items ────────────────────────────────────────────────────────────────────
select is(
  (select (pg_temp.sync('tide_watcher', curio_a, pg_temp.answers(4, 0), '["pgtap_potion"]',
    jsonb_build_array(jsonb_build_object('t', 'item', 'key', 'pgtap_potion', 'curio', curio_a))
      || pg_temp.win_log((select hp from hp where trainer = 'tide_watcher'), curio_a)) ->> 'won')::boolean from fx),
  true,
  'a win with an item the player has counts'
);
select is(
  (select quantity from player_inventory where app_user_id = (select user_a from fx) and item_key = 'pgtap_potion'),
  0,
  'the item comes off the inventory'
);
select is(
  (select (pg_temp.sync('tide_watcher', curio_a, pg_temp.answers(4, 0), '["pgtap_potion"]',
    jsonb_build_array(jsonb_build_object('t', 'item', 'key', 'pgtap_potion', 'curio', curio_a))
      || pg_temp.win_log((select hp from hp where trainer = 'tide_watcher'), curio_a)) ->> 'won')::boolean from fx),
  false,
  'a win with an item the player no longer has doesn''t count'
);
select is(
  (select quantity from player_inventory where app_user_id = (select user_a from fx) and item_key = 'pgtap_potion'),
  0,
  'the inventory never goes below zero'
);
select is(
  (select pg_temp.sync('tide_watcher', curio_a, pg_temp.answers(4, 0), '[]',
    jsonb_build_array(jsonb_build_object('t', 'item', 'key', 'pgtap_potion', 'curio', curio_a))
      || pg_temp.win_log((select hp from hp where trainer = 'tide_watcher'), curio_a)) ->> 'log_problem' from fx),
  'items don''t match the log',
  'the items logged have to be the items sent'
);

-- ── Someone else's curio ─────────────────────────────────────────────────────
select is(
  (select (pg_temp.sync('tide_watcher', curio_b, pg_temp.answers(4, 0), '[]',
    pg_temp.win_log((select hp from hp where trainer = 'tide_watcher'), curio_a)) ->> 'exp')::int from fx),
  0,
  'a win can''t level another kid''s curio'
);
select is(
  (select monster_exp from user_monsters where id = (select curio_b from fx)),
  0,
  'the other kid''s curio is untouched'
);

select is(
  (select count(*)::int from player_events where user_id = (select user_a from fx) and event_type = 'trainer_offline'),
  17,
  'each synced battle is recorded once'
);
select is(
  (select problem from offline_battle_logs where user_id = (select user_a from fx) and problem like 'hit too big%'),
  'hit too big for the curio''s level',
  'a log''s problem is kept with it'
);
select ok(
  not has_table_privilege('authenticated', 'public.offline_battle_logs', 'select'),
  'players can''t read the battle logs'
);

-- ── Not an Arena trainer, and someone else ───────────────────────────────────
select throws_ok(
  format('select sync_offline_trainer_battle(%L, gen_random_uuid(), %L, null, ''[]''::jsonb, ''[]''::jsonb, ''[]''::jsonb, true, now())',
    (select user_a from fx), 'training_tester'),
  'P0001', 'not an arena trainer: training_tester',
  'only Arena trainers can be synced'
);
select throws_ok(
  format('select sync_offline_trainer_battle(%L, gen_random_uuid(), %L, null, ''[]''::jsonb, ''[]''::jsonb, ''[]''::jsonb, true, now())',
    (select user_b from fx), 'forest_scout'),
  'P0001', 'not authorized',
  'a kid cannot sync a battle for someone else'
);

select * from finish();
rollback;
