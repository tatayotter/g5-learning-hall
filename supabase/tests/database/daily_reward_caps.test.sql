-- pgTAP tests for 20261004180000_daily_reward_caps: player-session gold/XP/item
-- gains are clamped to the daily allowance (never rejected), spending is never
-- capped, a direct inventory write can't sidestep the cap, server-side
-- (owner / service-role) grants aren't capped, live-battle gold via the
-- service role works again, and the weekly_packages side door is closed.

begin;
create extension if not exists pgtap;
select plan(16);

create temp table fx as
select gen_random_uuid() as kid_a_auth,
       gen_random_uuid() as kid_b_auth,
       -- Fixed names, not random hex: the children name filter reads digits as letters.
       'pgtap_rcap_kida' as kid_a,
       'pgtap_rcap_kidb' as kid_b;
grant select on fx to anon, authenticated, service_role;

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid_a, kid_a, 'x', 'PGTAP Kid A', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;
insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
select kid_b, kid_b, 'x', 'PGTAP Kid B', 'Grade 4', 'Test School', 'default', substr(md5(random()::text), 1, 10) from fx;
insert into user_identity_map (auth_uid, app_user_id)
select kid_a_auth, kid_a from fx union all select kid_b_auth, kid_b from fx;
insert into player_progress (user_id) select kid_a from fx union all select kid_b from fx
on conflict (user_id) do nothing;

create or replace function pg_temp.login_as(p_auth_uid uuid) returns void as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_auth_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_auth_uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$ language plpgsql;

create or replace function pg_temp.gold(p_user text) returns int as $$
  select gold from public.player_progress where user_id = p_user;
$$ language sql;

-- ── Gold / XP as a signed-in child ────────────────────────────────────────────
select pg_temp.login_as(kid_a_auth) from fx;
set local role authenticated;

select is((public.apply_progress_deltas((select kid_a from fx), 0, 15000) ->> 'gold')::int, 10000,
  'a 15,000 gold request is clamped to the 10,000 daily cap');
select is((public.apply_progress_deltas((select kid_a from fx), 0, 500) ->> 'gold')::int, 10000,
  'further gold the same day is clamped to zero, not rejected');
select is((public.apply_progress_deltas((select kid_a from fx), 0, -100) ->> 'gold')::int, 9900,
  'spending (a negative delta) is never capped');
select lives_ok(
  $$ select public.apply_progress_update((select kid_a from fx), 25000, 0) $$,
  'an over-cap XP request through apply_progress_update still succeeds'
);
select throws_ok(
  $$ select public.apply_progress_deltas((select kid_b from fx), 0, 10) $$,
  'P0001', 'not authorized',
  'a child still cannot change another player''s progress'
);
select throws_ok(
  $$ select * from public.consume_reward_allowance((select kid_b from fx), 0, 100, 0) $$,
  'P0001', 'not authorized',
  'a child cannot spend another player''s allowance'
);
select throws_ok('select count(*) from public.reward_daily_ledger', '42501', null,
  'players cannot read the reward ledger');

-- ── Items as a signed-in child ────────────────────────────────────────────────
select lives_ok(
  $$ select public.upsert_inventory((select kid_a from fx), 'health_potion', 50) $$,
  'an over-cap item grant still succeeds'
);
update player_inventory set quantity = 999
where app_user_id = (select kid_a from fx) and item_key = 'health_potion';
select is((select quantity from player_inventory where app_user_id = (select kid_a from fx) and item_key = 'health_potion'), 30,
  'items are clamped to 30 a day, including a direct quantity write');
select public.upsert_inventory((select kid_a from fx), 'health_potion', -1);
select is((select quantity from player_inventory where app_user_id = (select kid_a from fx) and item_key = 'health_potion'), 29,
  'consuming an item is never capped');

-- ── Ledger (read as owner) ────────────────────────────────────────────────────
reset role;
select is(
  (select format('%s/%s %s/%s %s/%s', xp_granted, xp_clamped, gold_granted, gold_clamped, items_granted, items_clamped)
   from reward_daily_ledger where user_id = (select kid_a from fx)),
  '20000/5000 10000/5500 30/989',
  'the ledger records granted and clamped amounts'
);

-- ── Server-side grants are not capped ─────────────────────────────────────────
-- Running as the table owner here stands in for a SECURITY DEFINER caller
-- (voucher / referral / parent-link reward).
select public.upsert_inventory((select kid_a from fx), 'health_potion', 100);
select is((select quantity from player_inventory where app_user_id = (select kid_a from fx) and item_key = 'health_potion'), 129,
  'grants made by server-side functions are not capped');

-- Live-battle gold is credited by resolve-live-battle with the service role.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claim.sub', '', true);
set local role service_role;
select is((public.apply_progress_deltas((select kid_a from fx), 0, 50) ->> 'gold')::int, 9950,
  'service-role gold (live PvP win) is credited and not capped');

-- ── Legacy weekly_packages side door ──────────────────────────────────────────
reset role;
select pg_temp.login_as(kid_b_auth) from fx;
set local role authenticated;
select throws_ok(
  $$ select public.apply_character_deltas((select kid_b from fx), current_date, 0, 100) $$,
  '42501', null,
  'players can no longer call apply_character_deltas'
);
select throws_ok(
  $$ select public.increment_weekly_counter((select kid_b from fx), 'mastery_count') $$,
  '42501', null,
  'players can no longer call increment_weekly_counter'
);

reset role;
select is(
  (select count(*)::int from pg_policies
   where schemaname = 'public' and tablename = 'weekly_packages' and cmd in ('INSERT', 'UPDATE', 'ALL')),
  0,
  'weekly_packages has no client write policies'
);

select * from finish();
rollback;
