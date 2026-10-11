-- pgTAP tests for apply_progress_update's achievement dedupe
-- (migration 20261011120000_achievement_award_dedupe): an achievement id the account already
-- owns is not new — its reward (from p_achievement_rewards) is taken back out of the xp/gold
-- deltas, and it is left out of the returned new_achievement_ids. Guards the multi-tab /
-- multi-device re-award seen 2026-10-09, where a stale tab re-paid achievements the account
-- already had.
--
-- Fixture: fresh random test identities, never real user data.

begin;
create extension if not exists pgtap;
select plan(13);

create temp table fx as
select gen_random_uuid() as auth_a, 'pgtap_ach_' || substr(md5(random()::text), 1, 8) as user_a;

insert into user_identity_map (auth_uid, app_user_id) select auth_a, user_a from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

select pg_temp.login_as(auth_a) from fx;

create temp table res (step int primary key, r jsonb);

-- ── Signature / grants ──────────────────────────────────────────────────────

select is(
  (select count(*)::int from pg_proc where proname = 'apply_progress_update' and pronamespace = 'public'::regnamespace),
  1, 'exactly one apply_progress_update overload exists'
);
select is(
  (select count(*)::int from pg_proc p, aclexplode(p.proacl) a
    where p.proname = 'apply_progress_update' and p.pronamespace = 'public'::regnamespace and a.grantee = 0),
  0, 'PUBLIC has no EXECUTE on apply_progress_update'
);

-- ── First award: new, paid, reported ────────────────────────────────────────

insert into res select 1, apply_progress_update(
  (select user_a from fx), 150, 30,
  p_new_achievement_ids => array['first_blood'],
  p_achievement_rewards => '{"first_blood": {"xp": 100, "gold": 20}}'::jsonb);

select is((select r -> 'new_achievement_ids' from res where step = 1), '["first_blood"]'::jsonb,
  'a first-time achievement is reported as new');
select is((select xp from player_progress where user_id = (select user_a from fx)), 150,
  'a first-time achievement keeps its xp reward');
select is((select gold from player_progress where user_id = (select user_a from fx)), 30,
  'a first-time achievement keeps its gold reward');

-- ── Stale tab re-sends the same achievement: not new, reward removed ────────

-- 50 xp / 10 gold from the quest itself + 100 / 20 for the (already owned) achievement.
insert into res select 2, apply_progress_update(
  (select user_a from fx), 150, 30,
  p_new_achievement_ids => array['first_blood'],
  p_achievement_rewards => '{"first_blood": {"xp": 100, "gold": 20}}'::jsonb);

select is((select r -> 'new_achievement_ids' from res where step = 2), '[]'::jsonb,
  'an already-owned achievement is not reported as new');
select is((select xp from player_progress where user_id = (select user_a from fx)), 200,
  'only the quest xp lands when the achievement was already owned');
select is((select gold from player_progress where user_id = (select user_a from fx)), 40,
  'only the quest gold lands when the achievement was already owned');
select is((select r -> 'achievements' from res where step = 2), '{"first_blood": true}'::jsonb,
  'the result carries the merged achievements map for the client to catch up');

-- ── Mixed batch, duplicates inside the array ────────────────────────────────

insert into res select 3, apply_progress_update(
  (select user_a from fx), 300, 0,
  p_new_achievement_ids => array['first_blood', 'perfect_strike', 'perfect_strike'],
  p_achievement_rewards => '{"first_blood": {"xp": 100, "gold": 0}, "perfect_strike": {"xp": 200, "gold": 0}}'::jsonb);

select is((select r -> 'new_achievement_ids' from res where step = 3), '["perfect_strike"]'::jsonb,
  'a mixed batch reports only the genuinely new id, once');
select is((select xp from player_progress where user_id = (select user_a from fx)), 400,
  'a mixed batch pays only the new achievement (200 + 200 xp, owned one removed)');

-- ── Old client: no rewards map, nothing subtracted ──────────────────────────

insert into res select 4, apply_progress_update(
  (select user_a from fx), 10, 0, p_new_achievement_ids => array['first_blood']);
select is((select xp from player_progress where user_id = (select user_a from fx)), 410,
  'without p_achievement_rewards (old client) the deltas are applied unchanged');

-- ── A crafted negative reward cannot add xp ─────────────────────────────────

insert into res select 5, apply_progress_update(
  (select user_a from fx), 0, 0,
  p_new_achievement_ids => array['first_blood'],
  p_achievement_rewards => '{"first_blood": {"xp": -5000, "gold": -5000}}'::jsonb);
select is((select xp from player_progress where user_id = (select user_a from fx)), 410,
  'a negative reward value is clamped to 0, so it cannot grant anything');

select * from finish();
rollback;
