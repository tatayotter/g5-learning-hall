-- pgTAP tests for apply_progress_update's mastery / purchased-items / honor-grants counters
-- (migration 20260923120000_fix_progress_mastery_purchase_honor_deltas): the new
-- p_mastery_delta / p_purchased_items_delta / p_honor_grants_delta params are DELTAS added to
-- the lifetime total, and the old absolute p_mastery_count / p_purchased_items / p_honor_grants
-- params are accepted but IGNORED. The regressions this guards:
--   * the old absolute-overwrite semantics meant any save that merely passed through this
--     week's (reset-to-0-weekly) value reset the lifetime total — so an UNRELATED save must
--     leave all three exactly as they were;
--   * a browser tab still running the pre-fix client keeps sending that weekly value in the
--     OLD params after the migration lands — it must neither clobber nor inflate the totals.
--
-- Fixture: fresh random test identities, never real user data.

begin;
create extension if not exists pgtap;
select plan(12);

create temp table fx as
select
  gen_random_uuid() as auth_a, 'pgtap_progress_' || substr(md5(random()::text), 1, 8) as user_a,
  gen_random_uuid() as auth_b, 'pgtap_progress_' || substr(md5(random()::text), 1, 8) as user_b;

insert into user_identity_map (auth_uid, app_user_id)
select auth_a, user_a from fx union all select auth_b, user_b from fx;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
end;
$$ language plpgsql;

select pg_temp.login_as(auth_a) from fx;

-- ── Identity (preserved from the live function) ─────────────────────────────

select throws_ok(
  format('select apply_progress_update(%L, p_mastery_delta => 1)', (select user_b from fx)),
  'P0001', 'not authorized',
  'cannot apply a progress update to another user'
);

-- ── Signature / grants: dropping and recreating must not leave a stray overload or widen access

select is(
  (select count(*)::int from pg_proc where proname = 'apply_progress_update' and pronamespace = 'public'::regnamespace),
  1, 'exactly one apply_progress_update overload exists (the old signature was dropped)'
);
select is(
  (select count(*)::int from pg_proc p, aclexplode(p.proacl) a
    where p.proname = 'apply_progress_update' and p.pronamespace = 'public'::regnamespace and a.grantee = 0),
  0, 'PUBLIC has no EXECUTE on apply_progress_update'
);
select ok(
  has_function_privilege('authenticated',
    (select oid from pg_proc where proname = 'apply_progress_update' and pronamespace = 'public'::regnamespace), 'EXECUTE'),
  'authenticated can still EXECUTE apply_progress_update'
);

-- ── Deltas add, never overwrite ─────────────────────────────────────────────

-- First call auto-creates the row; +1 mastery lands as 1.
select apply_progress_update((select user_a from fx), p_mastery_delta => 1);
select is(
  (select mastery_count from player_progress where user_id = (select user_a from fx)),
  1, 'first mastery delta creates the row and sets mastery_count to 1'
);

-- Second call adds on top: 1 + 1 = 2 masteries, 0 + 3 = 3 purchases, 0 + 1 = 1 honor grant.
select apply_progress_update((select user_a from fx), p_mastery_delta => 1, p_purchased_items_delta => 3, p_honor_grants_delta => 1);
select is(
  (select mastery_count from player_progress where user_id = (select user_a from fx)),
  2, 'second mastery delta is added to the total, not written over it'
);
select is(
  (select purchased_items from player_progress where user_id = (select user_a from fx)),
  3, 'purchased_items delta is added to the total'
);
select is(
  (select honor_grants from player_progress where user_id = (select user_a from fx)),
  1, 'honor_grants delta is added to the total'
);

-- ── The clobber / inflate regressions ───────────────────────────────────────

-- A tab still running the pre-fix client: sends this week's absolute value in the OLD params.
-- Ignored — no clobber (99 would inflate, 0 would reset) either way.
select apply_progress_update((select user_a from fx), 0, 0, 99, 99, 99);
select is(
  (select array[mastery_count, purchased_items, honor_grants] from player_progress where user_id = (select user_a from fx)),
  array[2, 3, 1],
  'the legacy absolute p_mastery_count/p_purchased_items/p_honor_grants params are ignored'
);

-- An unrelated save (gold/xp only, e.g. a battle reward) passing 0 for the three deltas...
select apply_progress_update((select user_a from fx), 10, 5, p_mastery_delta => 0, p_purchased_items_delta => 0, p_honor_grants_delta => 0);
select is(
  (select array[mastery_count, purchased_items, honor_grants] from player_progress where user_id = (select user_a from fx)),
  array[2, 3, 1],
  'a save that passes 0 deltas for mastery/purchased/honor leaves all three unchanged'
);

-- ...and one that omits them entirely (0 defaults).
select apply_progress_update((select user_a from fx), 10, 5);
select is(
  (select array[mastery_count, purchased_items, honor_grants] from player_progress where user_id = (select user_a from fx)),
  array[2, 3, 1],
  'a save that omits mastery/purchased/honor leaves all three unchanged'
);

-- The same calls still applied their xp/gold delta normally.
select is(
  (select gold from player_progress where user_id = (select user_a from fx)),
  10, 'the gold delta from the two unrelated saves (5 + 5) still applied'
);

select * from finish();
rollback;
