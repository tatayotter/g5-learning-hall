-- pgTAP tests for 20261003120000_keeper_egg: one Keeper's Egg per player,
-- a starter the player doesn't own, hatching on the third check-in day, a
-- missed day pausing (not resetting) a keeper egg, and graduation eggs
-- keeping their original 5-day / stall-on-gap rules.

begin;
create extension if not exists pgtap;
select plan(14);

create temp table fx as
select gen_random_uuid() as kid_auth,
       'pgtap_ke_' || substr(md5(random()::text), 1, 8) as kid;

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid, kid, 'x', 'PGTAP Egg Kid', 'Grade 3', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;

-- Owns five of the six starters, so the egg must be the sixth (torrenth).
insert into user_monsters (user_id, monster_id, monster_exp, monster_level, slot, rest_used)
select kid, s, 0, 1, null, 0 from fx, unnest(array['shadrak', 'voltmane', 'fernix', 'solarch', 'pyravex']) as s;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

-- Rewinds the keeper egg's last check-in to n days ago (UTC days, like the RPCs).
create or replace function pg_temp.rewind(p_kid text, p_days int) returns void as $$
  update public.curio_eggs set last_progress_date = (timezone('utc', now()))::date - p_days
  where user_id = p_kid and kind = 'keeper';
$$ language sql;

-- ── No identity: rejected ─────────────────────────────────────────────────────
select pg_temp.login_as(gen_random_uuid());
select throws_ok('select public.grant_keeper_egg()', 'P0001', 'not authorized',
  'a session with no mapped player cannot get a keeper egg');

insert into user_identity_map (auth_uid, app_user_id) select kid_auth, kid from fx;
select pg_temp.login_as(kid_auth) from fx;

-- ── Grant ─────────────────────────────────────────────────────────────────────
select is((public.grant_keeper_egg() ->> 'granted')::boolean, true, 'the first call grants the egg');
select is((select egg_species_id from curio_eggs e, fx where e.user_id = fx.kid and kind = 'keeper'), 'torrenth',
  'the egg is a starter the player does not own yet');
select is((select streak_progress || '/' || hatch_days from curio_eggs e, fx where e.user_id = fx.kid and kind = 'keeper'), '1/3',
  'day one counts on the day it is given; it hatches after three');
select is((public.grant_keeper_egg() ->> 'granted')::boolean, false, 'a second call grants nothing');
select is((select count(*)::int from curio_eggs e, fx where e.user_id = fx.kid and kind = 'keeper'), 1,
  'there is still only one keeper egg');

-- ── Day 2 after a missed day: waits instead of resetting ──────────────────────
select pg_temp.rewind(kid, 3) from fx;
select lives_ok(format('select public.sync_egg_progress(%L)', (select kid from fx)), 'sync runs');
select is((select status || ':' || streak_progress from curio_eggs e, fx where e.user_id = fx.kid and kind = 'keeper'), 'incubating:2',
  'a keeper egg back after a gap keeps its progress and counts today');

-- Same day again: no double count.
select lives_ok(format('select public.sync_egg_progress(%L)', (select kid from fx)), 'second sync the same day runs');
select is((select streak_progress from curio_eggs e, fx where e.user_id = fx.kid and kind = 'keeper'), 2,
  'the same day is not counted twice');

-- ── Day 3: hatches ────────────────────────────────────────────────────────────
select pg_temp.rewind(kid, 1) from fx;
select is(
  (select (h ->> 'species_id') || ':' || (h ->> 'kind')
     from (select public.sync_egg_progress(kid) -> 'hatched' -> 0 as h from fx) s),
  'torrenth:keeper',
  'the third check-in day hatches the egg, reported as a keeper egg (EggHatchModal uses kind)'
);
select is((select count(*)::int from user_monsters m, fx where m.user_id = fx.kid and m.monster_id = 'torrenth' and m.acquired_via = 'egg'), 1,
  'the hatchling joins the player''s curios');

-- ── Graduation eggs are unchanged: 5 days, a gap stalls and resets ────────────
insert into curio_eggs (user_id, egg_species_id, element, status, streak_progress, last_progress_date)
select kid, 'solarch', 'light', 'incubating', 4, (timezone('utc', now()))::date - 3 from fx;
select is((select hatch_days || ':' || kind from curio_eggs e, fx where e.user_id = fx.kid and e.kind = 'graduation'), '5:graduation',
  'existing eggs default to 5 days and the graduation kind');
select public.sync_egg_progress((select kid from fx));
select is((select status || ':' || streak_progress from curio_eggs e, fx where e.user_id = fx.kid and e.kind = 'graduation'), 'stalled:0',
  'a graduation egg still stalls and resets after a gap');

select * from finish();
rollback;
